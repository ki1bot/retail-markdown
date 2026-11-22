import logging
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from math import ceil

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RetailObservation

logger = logging.getLogger(__name__)

ZERO = Decimal("0")

class SummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        source = request.query_params.get(
            "source",
            "sales",
        ).strip().lower()

        if source not in {"sales", "inventory"}:
            return Response(
                {
                    "detail": (
                        "Sumber data tidak valid. "
                        "Gunakan sales atau inventory."
                    )
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

        except (TypeError, ValueError):
            return Response(
                {
                    "detail": "Tahun tidak valid."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not 2020 <= year <= 2035:
            return Response(
                {
                    "detail": (
                        "Tahun harus berada pada "
                        "rentang 2020–2035."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            base_queryset = (
                RetailObservation.objects.filter(
                    source=source,
                    category__iexact="Clothing",
                )
            )

            all_dates = list(
                base_queryset.values_list(
                    "observed_on",
                    flat=True,
                )
            )

            available_years = sorted({
                item.year
                for item in all_dates
                if item is not None
            })

            start_date = date(year, 1, 1)

            end_date = date(year + 1, 1, 1)

            rows = list(
                base_queryset.filter(
                    observed_on__gte=start_date,
                    observed_on__lt=end_date,
                )
                .order_by(
                    "observed_on",
                    "store_id",
                    "product_id",
                    "id",
                )
                .values_list(
                    "observed_on",
                    "store_id",
                    "product_id",
                    "units_sold",
                    "demand_value",
                    "price",
                    "inventory_level",
                    "discount",
                )
            )

            if not rows:
                return Response({
                    "available": False,
                    "source": source,
                    "year": year,
                    "available_years": available_years,
                    "rows": 0,
                    "sold": 0,
                    "demand": 0.0,
                    "average_price": "0.0000000000",
                    "average_inventory": 0.0,
                    "weekly_average": 0,
                    "stores": 0,
                    "products_count": 0,
                    "first_date": None,
                    "last_date": None,
                    "monthly": [],
                    "discounts": [],
                    "products": [],
                    "scatter_points": [],
                    "scatter_total_rows": 0,
                })

            row_count = len(rows)

            first_date = min(
                row[0] for row in rows
            )

            last_date = max(
                row[0] for row in rows
            )

            covered_days = (
                last_date - first_date
            ).days + 1

            total_sold = 0

            total_demand = ZERO

            total_price = ZERO

            total_inventory = ZERO

            stores = set()

            products_seen = set()

            monthly_stats = {
                month: {
                    "sold": 0,
                    "demand": ZERO,
                }
                for month in range(1, 13)
            }

            discount_stats = defaultdict(
                lambda: {
                    "rows": 0,
                    "sold": 0,
                    "demand": ZERO,
                }
            )

            product_stats = defaultdict(
                lambda: {
                    "sold": 0,
                    "rows": 0,
                }
            )

            latest_inventory = {}

            for row in rows:
                (
                    observed_on,
                    store_id,
                    product_id,
                    units_sold,
                    demand_value,
                    price,
                    inventory_level,
                    discount,
                ) = row

                sold_value = int(
                    units_sold or 0
                )

                demand_value = (
                    demand_value
                    if demand_value is not None
                    else ZERO
                )

                price = (
                    price
                    if price is not None
                    else ZERO
                )

                inventory_value = int(
                    inventory_level or 0
                )

                discount_value = int(
                    discount or 0
                )

                month = observed_on.month

                total_sold += sold_value

                total_demand += demand_value

                total_price += price

                total_inventory += Decimal(
                    inventory_value
                )

                stores.add(store_id)

                products_seen.add(product_id)

                monthly_stats[month]["sold"] += (
                    sold_value
                )

                monthly_stats[month]["demand"] += (
                    demand_value
                )

                discount_bucket = (
                    discount_stats[discount_value]
                )

                discount_bucket["rows"] += 1

                discount_bucket["sold"] += (
                    sold_value
                )

                discount_bucket["demand"] += (
                    demand_value
                )

                product_bucket = (
                    product_stats[product_id]
                )

                product_bucket["sold"] += (
                    sold_value
                )

                product_bucket["rows"] += 1

                if source == "inventory":
                    stock_key = (
                        month,
                        store_id,
                        product_id,
                    )

                    current = latest_inventory.get(
                        stock_key
                    )

                    if (
                        current is None
                        or observed_on >= current[0]
                    ):
                        latest_inventory[stock_key] = (
                            observed_on,
                            inventory_value,
                        )

            weekly_average = 0

            if covered_days > 0:
                weekly_average = int(
                    (
                        Decimal(total_sold)
                        * Decimal("7")
                        / Decimal(covered_days)
                    ).quantize(
                        Decimal("1"),
                        rounding=ROUND_HALF_UP,
                    )
                )

            average_price = (
                total_price
                / Decimal(row_count)
            ).quantize(
                Decimal("0.0000000001"),
                rounding=ROUND_HALF_UP,
            )
            average_inventory = float(
                (
                    total_inventory
                    / Decimal(row_count)
                ).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP,
                )
            )
            inventory_by_month = defaultdict(int)

            if source == "inventory":
                for (
                    month,
                    _store_id,
                    _product_id,
                ), (
                    _observed_on,
                    stock,
                ) in latest_inventory.items():
                    inventory_by_month[month] += stock

            monthly = []

            previous_sold = None

            for month in range(1, 13):
                month_sold = (
                    monthly_stats[month]["sold"]
                )

                month_demand = (
                    monthly_stats[month]["demand"]
                )

                growth = None

                if (
                    previous_sold is not None
                    and previous_sold > 0
                ):
                    growth = round(
                        (
                            (
                                month_sold
                                - previous_sold
                            )
                            / previous_sold
                        ) * 100,
                        2,
                    )

                monthly.append({
                    "month": month,
                    "sold": month_sold,
                    "demand": float(
                        month_demand
                    ),

                    "gap": float(
                        month_demand
                        - Decimal(month_sold)
                    ),

                    "sales_growth_pct": growth,

                    "inventory_end_stock": (
                        inventory_by_month.get(
                            month,
                            0,
                        )
                    ),
                })

                previous_sold = month_sold

            discounts = []

            for discount_value in sorted(
                discount_stats
            ):
                item = discount_stats[
                    discount_value
                ]

                count = item["rows"]

                discounts.append({
                    "discount": discount_value,
                    "rows": count,
                    "sold": item["sold"],
                    "demand": float(
                        item["demand"]
                    ),

                    "average_sold": (
                        item["sold"] / count
                        if count
                        else 0.0
                    ),

                    "average_demand": (
                        float(
                            item["demand"]
                            / Decimal(count)
                        )
                        if count
                        else 0.0
                    ),
                })

            products = [
                {
                    "product_id": product_id,
                    "sold": item["sold"],
                    "rows": item["rows"],
                }

                for product_id, item in sorted(
                    product_stats.items(),
                    key=lambda pair: (
                        -pair[1]["sold"],
                        pair[0],
                    ),
                )[:10]
            ]
            sample_step = max(
                1,
                ceil(row_count / 1500),
            )

            scatter_points = [
                {
                    "price": float(row[5]),
                    "discount": int(row[7]),
                    "units_sold": int(row[3]),
                }
                for row in rows[::sample_step]
            ]

            return Response({
                "available": True,
                "source": source,
                "year": year,
                "available_years": available_years,
                "rows": row_count,
                "sold": total_sold,
                "demand": float(total_demand),
                "average_price": str(
                    average_price
                ),
                "average_inventory": average_inventory,
                "weekly_average": weekly_average,
                "stores": len(stores),
                "products_count": len(products_seen),
                "first_date": first_date.isoformat(),
                "last_date": last_date.isoformat(),
                "monthly": monthly,
                "discounts": discounts,
                "products": products,
                "scatter_points": scatter_points,
                "scatter_total_rows": row_count,
            })

        except Exception:
            logger.exception(
                "Gagal membangun ringkasan retail: "
                "source=%s year=%s",
                source,
                year,
            )

            return Response(
                {
                    "detail": (
                        "Backend gagal membangun ringkasan dataset. "
                        "Periksa log layanan backend untuk detail teknis."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )