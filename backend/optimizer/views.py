import json

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import authenticate, login, logout
from django.db import connection
from django.db.models import Avg, Count, Max, Min, Sum
from django.db.models.functions import ExtractMonth, ExtractYear
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .importer import import_retail_csv
from .models import RetailObservation, SimulationRun
from .serializers import SimulationSerializer
from .services import optimize_discount


def user_payload(user):
    return {
        "id": user.id,
        "username": user.get_username(),
        "is_staff": user.is_staff,
    }


@ensure_csrf_cookie
@require_GET
def csrf_view(request):
    return JsonResponse({"status": "ok"})


@require_GET
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            "authenticated": False,
            "user": None,
        })

    return JsonResponse({
        "authenticated": True,
        "user": user_payload(request.user),
    })


@csrf_protect
@require_POST
def login_view(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse(
            {"detail": "Format permintaan tidak valid."},
            status=400,
        )

    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return JsonResponse(
            {"detail": "Username dan password wajib diisi."},
            status=400,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None or not user.is_active:
        return JsonResponse(
            {"detail": "Username atau password salah."},
            status=401,
        )

    login(request, user)

    return JsonResponse({
        "authenticated": True,
        "user": user_payload(user),
    })


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)

    return JsonResponse({
        "authenticated": False,
        "user": None,
    })


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return Response({
            "status": "ok",
            "service": "retail-markdown-api",
            "database": "connected",
        })


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        source = request.query_params.get(
            "source",
            "sales",
        )

        if source not in ("sales", "inventory"):
            return Response(
                {"detail": "Sumber data tidak valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year = int(
                request.query_params.get("year", "2023")
            )
        except ValueError:
            return Response(
                {"detail": "Tahun tidak valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if year < 2020 or year > 2035:
            return Response(
                {"detail": "Tahun di luar rentang yang diizinkan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_queryset = RetailObservation.objects.filter(
            source=source
        )

        available_years = list(
            source_queryset.annotate(
                observation_year=ExtractYear("observed_on")
            )
            .values_list("observation_year", flat=True)
            .distinct()
            .order_by("observation_year")
        )

        queryset = source_queryset.filter(
            observed_on__year=year
        )

        totals = queryset.aggregate(
            rows=Count("id"),
            sold=Sum("units_sold"),
            demand=Sum("demand_value"),
            average_price=Avg("price"),
            stores=Count("store_id", distinct=True),
            products=Count("product_id", distinct=True),
            first_date=Min("observed_on"),
            last_date=Max("observed_on"),
        )

        if totals["rows"] == 0:
            return Response({
                "available": False,
                "source": source,
                "year": year,
                "available_years": available_years,
                "rows": 0,
                "monthly": [],
                "discounts": [],
                "products": [],
            })

        sold = totals["sold"] or 0
        demand = totals["demand"] or Decimal("0")

        first_date = totals["first_date"]
        last_date = totals["last_date"]

        covered_days = (
            last_date - first_date
        ).days + 1

        weekly_average = int(
            (
                Decimal(sold)
                * Decimal("7")
                / Decimal(covered_days)
            ).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )

        average_price = totals["average_price"].quantize(
            Decimal("0.000001"),
            rounding=ROUND_HALF_UP,
        )

        monthly_rows = (
            queryset.annotate(
                month=ExtractMonth("observed_on")
            )
            .values("month")
            .annotate(
                sold=Sum("units_sold"),
                demand=Sum("demand_value"),
            )
            .order_by("month")
        )

        monthly_lookup = {
            item["month"]: item
            for item in monthly_rows
        }

        monthly = []

        for month in range(1, 13):
            item = monthly_lookup.get(month, {})

            monthly.append({
                "month": month,
                "sold": item.get("sold") or 0,
                "demand": float(
                    item.get("demand") or 0
                ),
            })

        discount_rows = (
            queryset.values("discount")
            .annotate(
                rows=Count("id"),
                sold=Sum("units_sold"),
                demand=Sum("demand_value"),
            )
            .order_by("discount")
        )

        discounts = [
            {
                "discount": item["discount"],
                "rows": item["rows"],
                "sold": item["sold"],
                "demand": float(item["demand"] or 0),
            }
            for item in discount_rows
        ]

        product_rows = (
            queryset.values("product_id")
            .annotate(
                sold=Sum("units_sold"),
                rows=Count("id"),
            )
            .order_by("-sold")[:10]
        )

        products = [
            {
                "product_id": item["product_id"],
                "sold": item["sold"],
                "rows": item["rows"],
            }
            for item in product_rows
        ]

        return Response({
            "available": True,
            "source": source,
            "year": year,
            "available_years": available_years,
            "rows": totals["rows"],
            "sold": sold,
            "demand": float(demand),
            "average_price": str(average_price),
            "weekly_average": weekly_average,
            "stores": totals["stores"],
            "products_count": totals["products"],
            "first_date": first_date.isoformat(),
            "last_date": last_date.isoformat(),
            "monthly": monthly,
            "discounts": discounts,
            "products": products,
        })


class ImportView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if uploaded_file is None:
            return Response(
                {"detail": "Pilih file CSV terlebih dahulu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = import_retail_csv(uploaded_file)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class OptimizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SimulationSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data

        result = optimize_discount(validated)

        if result is None:
            return Response(
                {
                    "detail": (
                        "Tidak ada kombinasi diskon yang dapat "
                        "menghabiskan stok dalam empat minggu. "
                        "Kurangi stok skenario atau sesuaikan "
                        "asumsi permintaan."
                    )
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        record = SimulationRun.objects.create(
            user=request.user,
            input_data={
                key: str(value)
                for key, value in validated.items()
            },
            result_data=result,
        )

        return Response({
            **result,
            "run_id": record.id,
        })


class HistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = (
            SimulationRun.objects.filter(
                user=request.user
            )
            .order_by("-created_at")[:20]
        )

        history = [
            {
                "id": record.id,
                "created_at": record.created_at.isoformat(),
                "input_data": record.input_data,
                "result_data": record.result_data,
            }
            for record in records
        ]

        return Response(history)