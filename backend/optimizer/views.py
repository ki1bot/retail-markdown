from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SimulationRun
from .serializers import SimulationSerializer
from .services import optimize_discount


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return Response(
            {
                "status": "ok",
                "service": "retail-markdown-api",
                "database": "connected",
            }
        )


class OptimizeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data

        result = optimize_discount(validated)

        if result is None:
            return Response(
                {
                    "detail": (
                        "Tidak ditemukan kombinasi diskon yang dapat "
                        "menghabiskan stok dalam empat minggu "
                        "dengan pilihan diskon 0% sampai 25%."
                    )
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        record = SimulationRun.objects.create(
            input_data={
                key: str(value)
                for key, value in validated.items()
            },
            result_data=result
        )

        return Response(
            {
                **result,
                "run_id": record.id,
            },
            status=status.HTTP_200_OK
        )


class HistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        records = SimulationRun.objects.order_by(
            "-created_at"
        )[:10]

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