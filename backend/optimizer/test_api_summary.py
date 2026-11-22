from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    RetailObservation,
    WarehouseSaleObservation,
)

class RetailSummaryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        RetailObservation.objects.create(
            source="sales",
            observed_on=date(2023, 1, 1),
            store_id="S001",
            product_id="P001",
            category="Clothing",
            region="North",
            inventory_level=100,
            units_sold=20,
            units_ordered=25,
            demand_value=Decimal("24.00"),
            price=Decimal("71.49"),
            discount=10,
            seasonality="Winter",
            promotion=True,
        )

        RetailObservation.objects.create(
            source="inventory",
            observed_on=date(2023, 1, 1),
            store_id="S001",
            product_id="P001",
            category="Clothing",
            region="North",
            inventory_level=100,
            units_sold=20,
            units_ordered=25,
            demand_value=Decimal("24.00"),
            price=Decimal("71.49"),
            discount=10,
            seasonality="Winter",
            promotion=True,
        )

        RetailObservation.objects.create(
            source="inventory",
            observed_on=date(2023, 1, 31),
            store_id="S001",
            product_id="P001",
            category="Clothing",
            region="North",
            inventory_level=80,
            units_sold=20,
            units_ordered=25,
            demand_value=Decimal("23.00"),
            price=Decimal("71.49"),
            discount=10,
            seasonality="Winter",
            promotion=True,
        )

    def test_sales_summary_returns_200(self):
        response = self.client.get(
            "/api/data/summary/?source=sales&year=2023"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["available"]
        )

        self.assertEqual(
            payload["rows"],
            1,
        )

        self.assertEqual(
            payload["sold"],
            20,
        )

        self.assertEqual(
            payload["stores"],
            1,
        )

        self.assertEqual(
            payload["products_count"],
            1,
        )

        self.assertEqual(
            payload["available_years"],
            [2023],
        )

    def test_inventory_summary_returns_month_end_stock(self):
        response = self.client.get(
            "/api/data/summary/?source=inventory&year=2023"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["available"]
        )

        self.assertEqual(
            payload["rows"],
            2,
        )

        self.assertEqual(
            payload["monthly"][0]["inventory_end_stock"],
            80,
        )

    def test_missing_year_returns_available_false(self):
        response = self.client.get(
            "/api/data/summary/?source=sales&year=2024"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertFalse(
            response.json()["available"]
        )

        self.assertEqual(
            response.json()["rows"],
            0,
        )


class WarehouseSummaryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        WarehouseSaleObservation.objects.create(
            year=2020,
            month=1,
            supplier="SUPPLIER A",
            item_code="100001",
            item_description="ITEM A",
            item_type="WINE",
            retail_sales=Decimal("10.50"),
            retail_transfers=Decimal("2.00"),
            warehouse_sales=Decimal("4.00"),
        )

        WarehouseSaleObservation.objects.create(
            year=2020,
            month=1,
            supplier="",
            item_code="100002",
            item_description="ITEM B",
            item_type="BEER",
            retail_sales=None,
            retail_transfers=Decimal("-1.00"),
            warehouse_sales=Decimal("-3.00"),
        )

    def test_warehouse_summary_returns_200(self):
        response = self.client.get(
            "/api/data/warehouse-summary/?year=2020"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["available"]
        )

        self.assertEqual(
            payload["rows"],
            2,
        )

        self.assertEqual(
            payload["suppliers_count"],
            1,
        )

        self.assertEqual(
            payload["products_count"],
            2,
        )

        self.assertEqual(
            payload["quality"]["missing_supplier"],
            1,
        )

        self.assertEqual(
            payload["quality"]["missing_retail_sales"],
            1,
        )

        self.assertEqual(
            payload["quality"]["negative_retail_transfers"],
            1,
        )

        self.assertEqual(
            payload["quality"]["negative_warehouse_sales"],
            1,
        )