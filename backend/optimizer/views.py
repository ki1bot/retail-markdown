import os

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .datasets import (
    DATASET_FILES,
    clear_dataset_cache,
    dataset_directory,
    get_dashboard_summary,
    get_dataset_status,
    validate_dataset_header,
)

from .elasticity import estimate_price_elasticity
from .models import SimulationRun
from .optimization import optimize_markdown
from .serializers import OptimizationInputSerializer

MAX_UPLOAD_SIZE = 160 * 1024 * 1024

@ensure_csrf_cookie
@require_GET
def csrf_view(request):
    return JsonResponse({"status": "ok"})

class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")

            database_status = "connected"

        except Exception:
            database_status = "unavailable"

        return Response({
            "status": "ok",
            "service": "retail-markdown-api",
            "database": database_status,
        })

class DatasetStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            return Response({
                "datasets": get_dataset_status()
            })

        except Exception as exc:
            return Response(
                {"detail": f"Gagal membaca status dataset: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class DashboardSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            year = int(
                request.query_params.get("year", 2023)
            )

            summary = get_dashboard_summary(year)

            return Response(summary)

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except FileNotFoundError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as exc:
            return Response(
                {"detail": f"Gagal membuat ringkasan: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class ElasticityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            year = int(
                request.query_params.get("year", 2023)
            )

            result = estimate_price_elasticity(year)

            return Response(result)

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except FileNotFoundError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as exc:
            return Response(
                {"detail": f"Gagal menghitung elastisitas: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class DatasetUploadView(APIView):
    permission_classes = [AllowAny]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request):
        dataset_key = str(
            request.data.get("dataset", "")
        ).strip()

        uploaded_file = request.FILES.get("file")

        if dataset_key not in DATASET_FILES:
            return Response(
                {
                    "detail": (
                        "Pilih salah satu dari lima jenis dataset "
                        "yang tersedia."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file is None:
            return Response(
                {"detail": "File CSV belum dipilih."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not uploaded_file.name.lower().endswith(".csv"):
            return Response(
                {"detail": "File harus berformat CSV."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            uploaded_file.size <= 0
            or uploaded_file.size > MAX_UPLOAD_SIZE
        ):
            return Response(
                {
                    "detail": (
                        "Ukuran file harus lebih dari 0 "
                        "dan tidak lebih dari 160 MB."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_dataset_header(
                dataset_key,
                uploaded_file,
            )

            directory = dataset_directory()
            directory.mkdir(
                parents=True,
                exist_ok=True,
            )

            target = (
                directory / DATASET_FILES[dataset_key]
            )

            temporary = target.with_suffix(
                target.suffix + ".uploading"
            )

            with temporary.open("wb") as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)

            os.replace(temporary, target)

            clear_dataset_cache()

            return Response({
                "message": (
                    f"{DATASET_FILES[dataset_key]} "
                    "berhasil disimpan."
                ),
                "dataset": dataset_key,
                "filename": DATASET_FILES[dataset_key],
                "size_bytes": uploaded_file.size,
            })

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except OSError as exc:
            return Response(
                {"detail": f"Gagal menyimpan file: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class OptimizeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OptimizationInputSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:
            result = optimize_markdown(
                stock=data["stock"],
                reference_price=data["reference_price"],
                unit_cost_ratio=data["unit_cost_ratio"],
                weekly_average_units_sold=data[
                    "weekly_average_units_sold"
                ],
                demand_ratio=data["demand_ratio"],
                elasticity=data["elasticity"],
                weeks=data["weeks"],
                discount_options=data["discount_options"],
            )

            SimulationRun.objects.create(
                input_data=data,
                result_data=result,
            )

            return Response(result)

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

class HistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        runs = SimulationRun.objects.all()[:30]

        return Response([
            {
                "id": item.id,
                "created_at": item.created_at.isoformat(),
                "input_data": item.input_data,
                "result_data": item.result_data,
            }
            for item in runs
        ])