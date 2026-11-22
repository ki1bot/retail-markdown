import logging
from collections import defaultdict
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WarehouseSaleObservation

logger = logging.getLogger(__name__)

ZERO = Decimal("0")

def as_number(value):
    return (
        float(value)
        if value is not None
        else 0.0
    )

class WarehouseSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        raw_year = request.query_params.get(
            "year"
        )

        try:
            base_queryset = (
                WarehouseSaleObservation.objects.all()
            )
            available_years = sorted(
                set(
                    base_queryset.values_list(
                        "year",
                        flat=True,
                    )
                )
            )

            if raw_year:
                year = int(raw_year)

            else:
                year = (
                    available_years[-1]
                    if available_years
                    else 2020
                )

        except (TypeError, ValueError):
            return Response(
                {
                    "detail": "Tahun tidak valid."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception(
                "Gagal membaca daftar tahun warehouse sales."
            )
            return Response(
                {
                    "detail": (
                        "Gagal membaca data warehouse sales."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not 1900 <= year <= 2100:
            return Response(
                {
                    "detail": (
                        "Tahun harus berada pada "
                        "rentang 1900–2100."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rows = list(
                base_queryset.filter(
                    year=year
                )

                .order_by(
                    "month",
                    "item_code",
                    "supplier",
                    "id",
                )

                .values_list(
                    "month",
                    "supplier",
                    "item_code",
                    "item_description",
                    "item_type",
                    "retail_sales",
                    "retail_transfers",
                    "warehouse_sales",
                )
            )

            if not rows:
                return Response({
                    "available": False,
                    "year": year,
                    "available_years": available_years,
                    "rows": 0,
                    "suppliers_count": 0,
                    "products_count": 0,
                    "item_types_count": 0,
                    "retail_sales": 0.0,
                    "retail_transfers": 0.0,
                    "warehouse_sales": 0.0,
                    "monthly": [],
                    "item_types": [],
                    "suppliers_top": [],
                    "items_top": [],
                    "quality": {},
                })

            total_retail_sales = ZERO

            total_retail_transfers = ZERO

            total_warehouse_sales = ZERO

            suppliers = set()

            item_codes = set()

            item_types_seen = set()

            missing_supplier = 0

            missing_retail_sales = 0

            negative_retail_sales = 0

            negative_retail_transfers = 0

            negative_warehouse_sales = 0

            monthly_stats = defaultdict(
                lambda: {
                    "rows": 0,
                    "retail_sales": ZERO,
                    "retail_transfers": ZERO,
                    "warehouse_sales": ZERO,
                }
            )

            type_stats = defaultdict(
                lambda: {
                    "rows": 0,
                    "products": set(),
                    "retail_sales": ZERO,
                    "retail_transfers": ZERO,
                    "warehouse_sales": ZERO,
                }
            )

            supplier_stats = defaultdict(
                lambda: {
                    "rows": 0,
                    "retail_sales": ZERO,
                    "retail_transfers": ZERO,
                    "warehouse_sales": ZERO,
                }
            )

            item_stats = defaultdict(
                lambda: {
                    "item_description": "",
                    "item_type": "",
                    "rows": 0,
                    "retail_sales": ZERO,
                    "retail_transfers": ZERO,
                    "warehouse_sales": ZERO,
                }
            )

            for row in rows:
                (
                    month,
                    supplier,
                    item_code,
                    item_description,
                    item_type,
                    retail_sales,
                    retail_transfers,
                    warehouse_sales,
                ) = row

                supplier = supplier or ""

                retail_sales_value = (
                    retail_sales
                    if retail_sales is not None
                    else ZERO
                )

                retail_transfers_value = (
                    retail_transfers
                    if retail_transfers is not None
                    else ZERO
                )

                warehouse_sales_value = (
                    warehouse_sales
                    if warehouse_sales is not None
                    else ZERO
                )

                total_retail_sales += (
                    retail_sales_value
                )

                total_retail_transfers += (
                    retail_transfers_value
                )

                total_warehouse_sales += (
                    warehouse_sales_value
                )

                item_codes.add(item_code)

                item_types_seen.add(item_type)

                if supplier:
                    suppliers.add(supplier)

                else:
                    missing_supplier += 1

                if retail_sales is None:
                    missing_retail_sales += 1

                elif retail_sales < 0:
                    negative_retail_sales += 1

                if retail_transfers_value < 0:
                    negative_retail_transfers += 1

                if warehouse_sales_value < 0:
                    negative_warehouse_sales += 1

                month_bucket = monthly_stats[month]

                month_bucket["rows"] += 1

                month_bucket["retail_sales"] += (
                    retail_sales_value
                )

                month_bucket["retail_transfers"] += (
                    retail_transfers_value
                )

                month_bucket["warehouse_sales"] += (
                    warehouse_sales_value
                )

                type_bucket = type_stats[item_type]

                type_bucket["rows"] += 1

                type_bucket["products"].add(
                    item_code
                )

                type_bucket["retail_sales"] += (
                    retail_sales_value
                )

                type_bucket["retail_transfers"] += (
                    retail_transfers_value
                )

                type_bucket["warehouse_sales"] += (
                    warehouse_sales_value
                )

                if supplier:
                    supplier_bucket = (
                        supplier_stats[supplier]
                    )

                    supplier_bucket["rows"] += 1

                    supplier_bucket["retail_sales"] += (
                        retail_sales_value
                    )

                    supplier_bucket["retail_transfers"] += (
                        retail_transfers_value
                    )

                    supplier_bucket["warehouse_sales"] += (
                        warehouse_sales_value
                    )

                item_bucket = item_stats[item_code]

                item_bucket["item_description"] = (
                    item_description
                )

                item_bucket["item_type"] = (
                    item_type
                )

                item_bucket["rows"] += 1

                item_bucket["retail_sales"] += (
                    retail_sales_value
                )

                item_bucket["retail_transfers"] += (
                    retail_transfers_value
                )

                item_bucket["warehouse_sales"] += (
                    warehouse_sales_value
                )

            monthly = [
                {
                    "month": month,
                    "rows": values["rows"],
                    "retail_sales": as_number(
                        values["retail_sales"]
                    ),

                    "retail_transfers": as_number(
                        values["retail_transfers"]
                    ),

                    "warehouse_sales": as_number(
                        values["warehouse_sales"]
                    ),
                }
                for month, values in sorted(
                    monthly_stats.items()
                )
            ]

            item_types = [
                {
                    "item_type": item_type,
                    "rows": values["rows"],
                    "products": len(
                        values["products"]
                    ),

                    "retail_sales": as_number(
                        values["retail_sales"]
                    ),

                    "retail_transfers": as_number(
                        values["retail_transfers"]
                    ),

                    "warehouse_sales": as_number(
                        values["warehouse_sales"]
                    ),
                }

                for item_type, values in sorted(
                    type_stats.items(),

                    key=lambda pair: (
                        -pair[1]["warehouse_sales"],
                        pair[0],
                    ),
                )
            ]

            suppliers_top = [
                {
                    "supplier": supplier,
                    "rows": values["rows"],
                    "retail_sales": as_number(
                        values["retail_sales"]
                    ),

                    "retail_transfers": as_number(
                        values["retail_transfers"]
                    ),

                    "warehouse_sales": as_number(
                        values["warehouse_sales"]
                    ),
                }

                for supplier, values in sorted(
                    supplier_stats.items(),

                    key=lambda pair: (
                        -pair[1]["warehouse_sales"],
                        pair[0],
                    ),
                )[:10]
            ]

            items_top = [
                {
                    "item_code": item_code,

                    "item_description": (
                        values["item_description"]
                    ),

                    "item_type": (
                        values["item_type"]
                    ),

                    "rows": values["rows"],

                    "retail_sales": as_number(
                        values["retail_sales"]
                    ),

                    "retail_transfers": as_number(
                        values["retail_transfers"]
                    ),

                    "warehouse_sales": as_number(
                        values["warehouse_sales"]
                    ),
                }

                for item_code, values in sorted(
                    item_stats.items(),

                    key=lambda pair: (
                        -pair[1]["warehouse_sales"],
                        pair[0],
                    ),
                )[:10]
            ]

            return Response({
                "available": True,
                "year": year,
                "available_years": available_years,
                "rows": len(rows),
                "suppliers_count": len(suppliers),
                "products_count": len(item_codes),
                "item_types_count": len(item_types_seen),
                "retail_sales": as_number(
                    total_retail_sales
                ),

                "retail_transfers": as_number(
                    total_retail_transfers
                ),

                "warehouse_sales": as_number(
                    total_warehouse_sales
                ),

                "monthly": monthly,

                "item_types": item_types,

                "suppliers_top": suppliers_top,

                "items_top": items_top,

                "quality": {
                    "missing_supplier": (
                        missing_supplier
                    ),
                    "missing_retail_sales": (
                        missing_retail_sales
                    ),
                    "negative_retail_sales": (
                        negative_retail_sales
                    ),
                    "negative_retail_transfers": (
                        negative_retail_transfers
                    ),
                    "negative_warehouse_sales": (
                        negative_warehouse_sales
                    ),
                    "observed_months": [
                        item["month"]
                        for item in monthly
                    ],
                },
            })

        except Exception:
            logger.exception(
                "Gagal membangun ringkasan warehouse sales "
                "untuk year=%s",
                year,
            )

            return Response(
                {
                    "detail": (
                        "Backend gagal membangun ringkasan "
                        "warehouse sales. Periksa log "
                        "layanan backend untuk detail teknis."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )