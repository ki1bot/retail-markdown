from decimal import Decimal, ROUND_HALF_UP
from math import log, sqrt

from django.db import connection

from django.db.models import (
    Avg,
    Count,
    Max,
    Min,
    Q,
    Sum,
)

from django.db.models.functions import (
    ExtractMonth,
    ExtractYear,
)

from django.http import JsonResponse
from django.utils.decorators import method_decorator

from django.views.decorators.csrf import (
    csrf_protect,
    ensure_csrf_cookie,
)

from django.views.decorators.http import require_GET

from rest_framework import status

from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .importer import import_dataset_csv

from .models import (
    RetailObservation,
    SimulationRun,
    WarehouseSaleObservation,
)

from .serializers import SimulationSerializer
from .services import optimize_discount

@ensure_csrf_cookie
@require_GET
def csrf_view(request):

    return JsonResponse({
        "status": "ok",
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

class DatasetStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        datasets = {
            "sales": {
                "source": "sales",
                "rows": 0,
                "first_date": None,
                "last_date": None,
                "stores": 0,
                "products": 0,
            },
            "inventory": {
                "source": "inventory",
                "rows": 0,
                "first_date": None,
                "last_date": None,
                "stores": 0,
                "products": 0,
            },
            "warehouse_sales": {
                "source": "warehouse_sales",
                "rows": 0,
                "first_year": None,
                "last_year": None,
                "years": [],
                "months": [],
                "suppliers": 0,
                "products": 0,
            },
        }

        records = (
            RetailObservation.objects
            .values("source")
            .annotate(
                rows=Count("id"),
                first_date=Min("observed_on"),
                last_date=Max("observed_on"),
                stores=Count(
                    "store_id",
                    distinct=True,
                ),
                products=Count(
                    "product_id",
                    distinct=True,
                ),
            )
            .order_by("source")
        )

        for record in records:
            source = record["source"]

            if source not in datasets:
                continue

            datasets[source] = {
                "source": source,
                "rows": record["rows"],
                "first_date": (
                    record["first_date"].isoformat()
                    if record["first_date"]
                    else None
                ),
                "last_date": (
                    record["last_date"].isoformat()
                    if record["last_date"]
                    else None
                ),
                "stores": record["stores"],
                "products": record["products"],
            }

        warehouse_queryset = (
            WarehouseSaleObservation.objects.all()
        )

        warehouse_totals = (
            warehouse_queryset.aggregate(
                rows=Count("id"),

                first_year=Min("year"),

                last_year=Max("year"),

                suppliers=Count(
                    "supplier",
                    filter=~Q(supplier=""),
                    distinct=True,
                ),

                products=Count(
                    "item_code",
                    distinct=True,
                ),
            )
        )

        warehouse_years = list(
            warehouse_queryset
            .values_list(
                "year",
                flat=True,
            )
            .distinct()
            .order_by("year")
        )

        warehouse_months = list(
            warehouse_queryset
            .values_list(
                "month",
                flat=True,
            )
            .distinct()
            .order_by("month")
        )

        datasets["warehouse_sales"] = {
            "source": "warehouse_sales",

            "rows": (
                warehouse_totals["rows"] or 0
            ),

            "first_year": (
                warehouse_totals["first_year"]
            ),

            "last_year": (
                warehouse_totals["last_year"]
            ),

            "years": warehouse_years,

            "months": warehouse_months,

            "suppliers": (
                warehouse_totals["suppliers"] or 0
            ),

            "products": (
                warehouse_totals["products"] or 0
            ),
        }

        return Response({
            "datasets": datasets,
        })

class SummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        source = request.query_params.get(
            "source",
            "sales",
        )

        if source not in (
            "sales",
            "inventory",
        ):

            return Response(
                {
                    "detail": "Sumber data tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year = int(
                request.query_params.get(
                    "year",
                    "2023",
                )
            )
        except ValueError:
            return Response(
                {
                    "detail": "Tahun tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if year < 2020 or year > 2035:
            return Response(
                {
                    "detail": (
                        "Tahun di luar rentang yang diizinkan."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_queryset = (
            RetailObservation.objects.filter(
                source=source
            )
        )

        available_years = list(
            source_queryset
            .annotate(
                observation_year=ExtractYear(
                    "observed_on"
                )
            )
            .values_list(
                "observation_year",
                flat=True,
            )
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

            stores=Count(
                "store_id",
                distinct=True,
            ),

            products=Count(
                "product_id",
                distinct=True,
            ),

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

        demand = (
            totals["demand"]
            or Decimal("0")
        )

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

        average_price = (
            totals["average_price"].quantize(
                Decimal("0.000001"),
                rounding=ROUND_HALF_UP,
            )
        )

        monthly_rows = (
            queryset
            .annotate(
                month=ExtractMonth(
                    "observed_on"
                )
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

            item = monthly_lookup.get(
                month,
                {},
            )

            monthly.append({
                "month": month,

                "sold": (
                    item.get("sold") or 0
                ),

                "demand": float(
                    item.get("demand") or 0
                ),
            })

        discount_rows = (
            queryset
            .values("discount")
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
                "demand": float(
                    item["demand"] or 0
                ),
            }
            for item in discount_rows
        ]

        product_rows = (
            queryset
            .values("product_id")
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
            "average_price": str(
                average_price
            ),

            "weekly_average": weekly_average,
            "stores": totals["stores"],
            "products_count": totals["products"],
            "first_date": first_date.isoformat(),
            "last_date": last_date.isoformat(),
            "monthly": monthly,
            "discounts": discounts,
            "products": products,
        })

class ElasticityEstimateView(APIView):

    """
    Diagnostik estimasi elastisitas harga menggunakan
    regresi bivariate log-log pada data Clothing.
    """

    permission_classes = [AllowAny]

    def get(self, request):

        source = request.query_params.get(
            "source",
            "sales",
        )

        if source not in (
            "sales",
            "inventory",
        ):

            return Response(
                {
                    "detail": "Sumber data tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year = int(
                request.query_params.get(
                    "year",
                    "2023",
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            return Response(
                {
                    "detail": "Tahun tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if year < 2020 or year > 2035:

            return Response(
                {
                    "detail": "Tahun tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        records = (
            RetailObservation.objects
            .filter(
                source=source,
                observed_on__year=year,
                category__iexact="Clothing",
                units_sold__gt=0,
                price__gt=0,
            )
            .values_list(
                "price",
                "discount",
                "units_sold",
            )
        )

        x_values = []
        y_values = []

        for price, discount, units_sold in records.iterator():

            effective_price = (
                float(price)
                * (
                    1.0
                    - float(discount) / 100.0
                )
            )

            if (
                effective_price <= 0
                or units_sold <= 0
            ):
                continue

            x_values.append(
                log(effective_price)
            )

            y_values.append(
                log(float(units_sold))
            )

        sample_size = len(x_values)

        method = (
            "Bivariate log-log OLS: "
            "ln(Units Sold) ~ ln(Effective Price)"
        )

        if sample_size < 3:

            return Response({
                "available": False,

                "source": source,

                "year": year,

                "sample_size": sample_size,

                "elasticity_estimate": None,

                "r_squared": None,

                "method": method,

                "recommended_for_optimizer": False,

                "used_automatically": False,

                "interpretation": (
                    "Jumlah observasi positif belum cukup "
                    "untuk menghitung regresi log-log."
                ),
            })

        mean_x = (
            sum(x_values) / sample_size
        )

        mean_y = (
            sum(y_values) / sample_size
        )

        sxx = sum(
            (value - mean_x) ** 2
            for value in x_values
        )

        syy = sum(
            (value - mean_y) ** 2
            for value in y_values
        )

        if sxx <= 0:

            return Response({
                "available": False,

                "source": source,

                "year": year,

                "sample_size": sample_size,

                "elasticity_estimate": None,

                "r_squared": None,

                "method": method,

                "recommended_for_optimizer": False,

                "used_automatically": False,

                "interpretation": (
                    "Variasi effective price tidak cukup "
                    "untuk mengestimasi koefisien elastisitas."
                ),
            })

        covariance = sum(
            (
                x_values[index] - mean_x
            ) * (
                y_values[index] - mean_y
            )

            for index in range(sample_size)
        )

        elasticity = (
            covariance / sxx
        )

        intercept = (
            mean_y - elasticity * mean_x
        )

        residual_sum = sum(
            (
                y_values[index]
                - (
                    intercept
                    + elasticity * x_values[index]
                )
            ) ** 2

            for index in range(sample_size)
        )

        r_squared = (
            1.0 - (residual_sum / syy)
            if syy > 0
            else 0.0
        )

        r_squared = max(
            0.0,
            min(1.0, r_squared),
        )

        standard_error = (
            sqrt(
                (
                    residual_sum
                    / (sample_size - 2)
                ) / sxx
            )
            if sample_size > 2
            else None
        )

        if elasticity >= 0:

            interpretation = (
                "Koefisien estimasi bernilai nol atau positif. "
                "Pola ini tidak sesuai dengan hubungan "
                "permintaan-harga yang diharapkan, sehingga "
                "estimasi tidak layak dipakai sebagai elastisitas "
                "untuk optimasi markdown. Periksa kualitas data "
                "dan faktor perancu."
            )

        elif r_squared < 0.10:

            interpretation = (
                "Koefisien bernilai negatif, tetapi daya jelas "
                "model rendah (R² di bawah 0,10). Estimasi masih "
                "lemah dan tidak boleh dianggap sebagai "
                "elastisitas yang tervalidasi."
            )

        else:

            interpretation = (
                "Koefisien bernilai negatif dan model menjelaskan "
                "sebagian variasi log penjualan. Estimasi tetap "
                "bersifat indikatif karena model sederhana belum "
                "mengendalikan seluruh faktor perancu dan belum "
                "diuji secara kausal."
            )

        recommended = (
            elasticity < 0
            and r_squared >= 0.10
            and sample_size >= 30
        )

        return Response({
            "available": True,

            "source": source,

            "year": year,

            "sample_size": sample_size,

            "elasticity_estimate": round(
                elasticity,
                4,
            ),

            "r_squared": round(
                r_squared,
                4,
            ),

            "standard_error": (
                round(standard_error, 4)
                if standard_error is not None
                else None
            ),

            "method": method,

            "recommended_for_optimizer": recommended,

            "used_automatically": False,

            "interpretation": interpretation,

            "limitation": (
                "Regresi ini bersifat bivariate dan tidak "
                "mengendalikan promosi, musim, toko, produk, "
                "ketersediaan stok, maupun faktor pasar lain. "
                "Gunakan sebagai diagnostik, bukan klaim "
                "hubungan sebab-akibat."
            ),
        })

class WarehouseSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        base_queryset = (
            WarehouseSaleObservation.objects.all()
        )
        available_years = list(
            base_queryset
            .values_list(
                "year",
                flat=True,
            )
            .distinct()
            .order_by("year")
        )
        raw_year = request.query_params.get(
            "year"
        )

        try:
            year = (
                int(raw_year)
                if raw_year
                else (
                    available_years[-1]
                    if available_years
                    else 2020
                )
            )

        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "detail": "Tahun tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not 1900 <= year <= 2100:
            return Response(
                {
                    "detail": "Tahun tidak valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = base_queryset.filter(
            year=year
        )

        totals = queryset.aggregate(
            rows=Count("id"),

            retail_sales=Sum("retail_sales"),

            retail_transfers=Sum("retail_transfers"),

            warehouse_sales=Sum("warehouse_sales"),

            suppliers_count=Count(
                "supplier",
                filter=~Q(supplier=""),
                distinct=True,
            ),

            products_count=Count(
                "item_code",
                distinct=True,
            ),

            item_types_count=Count(
                "item_type",
                distinct=True,
            ),

            missing_supplier=Count(
                "id",
                filter=Q(supplier=""),
            ),

            missing_retail_sales=Count(
                "id",
                filter=Q(retail_sales__isnull=True),
            ),

            negative_retail_sales=Count(
                "id",
                filter=Q(retail_sales__lt=0),
            ),

            negative_retail_transfers=Count(
                "id",
                filter=Q(retail_transfers__lt=0),
            ),

            negative_warehouse_sales=Count(
                "id",
                filter=Q(warehouse_sales__lt=0),
            ),
        )

        if not totals["rows"]:
            return Response({
                "available": False,
                "year": year,
                "available_years": available_years,
                "rows": 0,
                "monthly": [],
                "item_types": [],
                "suppliers_top": [],
                "items_top": [],
                "quality": {},
            })

        def as_number(value):
            return (
                float(value)
                if value is not None
                else 0.0
            )

        monthly_rows = (
            queryset
            .values("month")
            .annotate(
                rows=Count("id"),
                retail_sales=Sum("retail_sales"),
                retail_transfers=Sum("retail_transfers"),
                warehouse_sales=Sum("warehouse_sales"),
            )
            .order_by("month")
        )

        monthly = [
            {
                "month": item["month"],
                "rows": item["rows"],
                "retail_sales": as_number(
                    item["retail_sales"]
                ),
                "retail_transfers": as_number(
                    item["retail_transfers"]
                ),
                "warehouse_sales": as_number(
                    item["warehouse_sales"]
                ),
            }

            for item in monthly_rows
        ]

        item_type_rows = (
            queryset
            .values("item_type")
            .annotate(
                rows=Count("id"),

                products=Count(
                    "item_code",
                    distinct=True,
                ),

                retail_sales=Sum("retail_sales"),

                retail_transfers=Sum("retail_transfers"),

                warehouse_sales=Sum("warehouse_sales"),
            )
            .order_by(
                "-warehouse_sales",
                "item_type",
            )
        )

        item_types = [
            {
                "item_type": item["item_type"],

                "rows": item["rows"],

                "products": item["products"],

                "retail_sales": as_number(
                    item["retail_sales"]
                ),

                "retail_transfers": as_number(
                    item["retail_transfers"]
                ),

                "warehouse_sales": as_number(
                    item["warehouse_sales"]
                ),
            }

            for item in item_type_rows
        ]

        supplier_rows = (
            queryset
            .exclude(supplier="")
            .values("supplier")
            .annotate(
                rows=Count("id"),

                retail_sales=Sum("retail_sales"),

                retail_transfers=Sum("retail_transfers"),

                warehouse_sales=Sum("warehouse_sales"),
            )
            .order_by(
                "-warehouse_sales",
                "supplier",
            )[:10]
        )

        suppliers_top = [
            {
                "supplier": item["supplier"],

                "rows": item["rows"],

                "retail_sales": as_number(
                    item["retail_sales"]
                ),

                "retail_transfers": as_number(
                    item["retail_transfers"]
                ),

                "warehouse_sales": as_number(
                    item["warehouse_sales"]
                ),
            }

            for item in supplier_rows
        ]

        item_rows = (
            queryset
            .values(
                "item_code",
                "item_description",
                "item_type",
            )
            .annotate(
                rows=Count("id"),

                retail_sales=Sum("retail_sales"),

                retail_transfers=Sum("retail_transfers"),

                warehouse_sales=Sum("warehouse_sales"),
            )
            .order_by(
                "-warehouse_sales",
                "item_code",
            )[:10]
        )

        items_top = [
            {
                "item_code": item["item_code"],

                "item_description": item["item_description"],

                "item_type": item["item_type"],

                "rows": item["rows"],

                "retail_sales": as_number(
                    item["retail_sales"]
                ),

                "retail_transfers": as_number(
                    item["retail_transfers"]
                ),

                "warehouse_sales": as_number(
                    item["warehouse_sales"]
                ),
            }

            for item in item_rows
        ]

        return Response({

            "available": True,

            "year": year,

            "available_years": available_years,

            "rows": totals["rows"],

            "suppliers_count": (
                totals["suppliers_count"] or 0
            ),

            "products_count": (
                totals["products_count"] or 0
            ),

            "item_types_count": (
                totals["item_types_count"] or 0
            ),

            "retail_sales": as_number(
                totals["retail_sales"]
            ),

            "retail_transfers": as_number(
                totals["retail_transfers"]
            ),

            "warehouse_sales": as_number(
                totals["warehouse_sales"]
            ),

            "monthly": monthly,

            "item_types": item_types,

            "suppliers_top": suppliers_top,

            "items_top": items_top,

            "quality": {
                "missing_supplier": (
                    totals["missing_supplier"] or 0
                ),

                "missing_retail_sales": (
                    totals["missing_retail_sales"] or 0
                ),

                "negative_retail_sales": (
                    totals["negative_retail_sales"] or 0
                ),

                "negative_retail_transfers": (
                    totals["negative_retail_transfers"] or 0
                ),

                "negative_warehouse_sales": (
                    totals["negative_warehouse_sales"] or 0
                ),

                "observed_months": [
                    item["month"]
                    for item in monthly
                ],
            },
        })

@method_decorator(
    csrf_protect,
    name="dispatch",
)
class ImportView(APIView):
    permission_classes = [AllowAny]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request):
        uploaded_file = request.FILES.get(
            "file"
        )

        if uploaded_file is None:
            return Response(
                {
                    "detail": (
                        "Pilih file CSV terlebih dahulu."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = import_dataset_csv(
                uploaded_file
            )

        except ValueError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

@method_decorator(
    csrf_protect,
    name="dispatch",
)
class OptimizeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SimulationSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        validated = serializer.validated_data

        result = optimize_discount(
            validated
        )

        if result is None:
            return Response(
                {
                    "detail": (
                        "Tidak ada kombinasi diskon yang dapat "
                        "menghabiskan stok dalam empat minggu. "
                        "Kurangi stok skenario atau sesuaikan "
                        "asumsi permintaan."
                    ),
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        record = SimulationRun.objects.create(
            user=None,
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
    permission_classes = [AllowAny]

    def get(self, request):
        records = (
            SimulationRun.objects
            .order_by("-created_at")[:20]
        )

        history = [
            {
                "id": record.id,

                "created_at": (
                    record.created_at.isoformat()
                ),

                "input_data": record.input_data,
                "result_data": record.result_data,
            }
            for record in records
        ]

        return Response(history)