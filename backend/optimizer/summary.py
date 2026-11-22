from decimal import Decimal, ROUND_HALF_UP
from math import ceil

from django.db.models import Avg, Count, Min, Sum
from django.db.models.functions import ExtractMonth, ExtractYear

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RetailObservation

class SummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        source = request.query_params.get("source", "sales")

        if source not in ("sales", "inventory"):
            return Response(
                {"detail": "Sumber data tidak valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year = int(request.query_params.get("year", "2023"))
        except (TypeError, ValueError):
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
            source=source,
            category__iexact="Clothing",
        )

        available_years = list(
            source_queryset
            .annotate(observation_year=ExtractYear("observed_on"))
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
            average_inventory=Avg("inventory_level"),
            stores=Count("store_id", distinct=True),
            products=Count("product_id", distinct=True),
            first_date=Min("observed_on"),
            last_date=Max("observed_on"),
        )

        if not totals["rows"]:
            return Response({
                "available": False,
                "source": source,
                "year": year,
                "available_years": available_years,
                "rows": 0,
                "sold": 0,
                "demand": 0,
                "average_price": "0.000000",
                "average_inventory": 0,
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

        sold_total = int(totals["sold"] or 0)
        demand_total = totals["demand"] or Decimal("0")

        first_date = totals["first_date"]
        last_date = totals["last_date"]

        covered_days = (last_date - first_date).days + 1

        weekly_average = 0

        if covered_days > 0:
            weekly_average = int(
                (
                    Decimal(sold_total)
                    * Decimal("7")
                    / Decimal(covered_days)
                ).quantize(
                    Decimal("1"),
                    rounding=ROUND_HALF_UP,
                )
            )

        average_price = (
            totals["average_price"] or Decimal("0")
        )

        average_price = average_price.quantize(
            Decimal("0.0000000001"),
            rounding=ROUND_HALF_UP,
        )

        average_inventory = (
            totals["average_inventory"] or Decimal("0")
        )

        monthly_rows = (
            queryset
            .annotate(month=ExtractMonth("observed_on"))
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

            month_sold = int(item.get("sold") or 0)

            month_demand = (
                item.get("demand") or Decimal("0")
            )

            monthly.append({
                "month": month,
                "sold": month_sold,
                "demand": float(month_demand),
                "gap": float(
                    month_demand - Decimal(month_sold)
                ),
                "sales_growth_pct": None,
                "inventory_end_stock": 0,
            })

        previous_sold = None

        for item in monthly:
            if previous_sold is not None and previous_sold > 0:
                item["sales_growth_pct"] = round(
                    (
                        (item["sold"] - previous_sold)
                        / previous_sold
                    ) * 100,
                    2,
                )

            previous_sold = item["sold"]

        if source == "inventory":

            latest_stock_by_pair = {}

            stock_rows = (
                queryset
                .order_by(
                    "store_id",
                    "product_id",
                    "observed_on",
                    "id",
                )
                .values_list(
                    "observed_on",
                    "store_id",
                    "product_id",
                    "inventory_level",
                )
            )

            for (
                observed_on,
                store_id,
                product_id,
                inventory_level,
            ) in stock_rows:

                key = (
                    observed_on.month,
                    store_id,
                    product_id,
                )

                latest_stock_by_pair[key] = int(
                    inventory_level
                )

            stock_by_month = {}

            for (
                month,
                _store_id,
                _product_id,
            ), stock in latest_stock_by_pair.items():

                stock_by_month[month] = (
                    stock_by_month.get(month, 0) + stock
                )

            for item in monthly:
                item["inventory_end_stock"] = (
                    stock_by_month.get(item["month"], 0)
                )

        discount_rows = (
            queryset
            .values("discount")
            .annotate(
                rows=Count("id"),
                sold=Sum("units_sold"),
                demand=Sum("demand_value"),
                average_sold=Avg("units_sold"),
                average_demand=Avg("demand_value"),
            )
            .order_by("discount")
        )

        discounts = [
            {
                "discount": item["discount"],
                "rows": item["rows"],
                "sold": int(item["sold"] or 0),
                "demand": float(item["demand"] or 0),
                "average_sold": float(
                    item["average_sold"] or 0
                ),
                "average_demand": float(
                    item["average_demand"] or 0
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
            .order_by("-sold", "product_id")[:10]
        )

        products = [
            {
                "product_id": item["product_id"],
                "sold": int(item["sold"] or 0),
                "rows": item["rows"],
            }
            for item in product_rows
        ]

        scatter_rows = list(
            queryset
            .order_by(
                "observed_on",
                "store_id",
                "product_id",
                "id",
            )
            .values_list(
                "price",
                "discount",
                "units_sold",
            )
        )

        scatter_total_rows = len(scatter_rows)

        sample_step = max(
            1,
            ceil(scatter_total_rows / 1500),
        )

        scatter_points = [
            {
                "price": float(price),
                "discount": int(discount),
                "units_sold": int(units_sold),
            }
            for price, discount, units_sold
            in scatter_rows[::sample_step]
        ]

        return Response({
            "available": True,
            "source": source,
            "year": year,
            "available_years": available_years,
            "rows": totals["rows"],
            "sold": sold_total,
            "demand": float(demand_total),
            "average_price": str(average_price),
            "average_inventory": round(
                float(average_inventory),
                2,
            ),
            "weekly_average": weekly_average,
            "stores": totals["stores"],
            "products_count": totals["products"],
            "first_date": first_date.isoformat(),
            "last_date": last_date.isoformat(),
            "monthly": monthly,
            "discounts": discounts,
            "products": products,
            "scatter_points": scatter_points,
            "scatter_total_rows": scatter_total_rows,
        })
