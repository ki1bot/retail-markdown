from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase

from .importer import import_retail_csv
from .models import RetailObservation
from .services import optimize_discount


class SimulationTests(SimpleTestCase):
    def test_reference_scenario(self):
        data = {
            "stock": 30000,
            "price": Decimal("71.491646"),
            "weekly_average": 10523,
            "demand_ratio": Decimal("0.50"),
            "hpp_ratio": Decimal("0.60"),
            "elasticity": Decimal("-2.0"),
        }

        result = optimize_discount(data)

        self.assertIsNotNone(result)

        self.assertEqual(
            result["best_plan"],
            [15, 15, 15, 20],
        )

        self.assertEqual(
            result["tested_plans"],
            1296,
        )

        self.assertEqual(
            result["feasible_plans"],
            352,
        )

        self.assertEqual(
            result["total_sold"],
            30000,
        )

        self.assertEqual(
            result["remaining"],
            0,
        )

        self.assertEqual(
            result["total_profit"],
            "507040.20",
        )

    def test_unreachable_stock_target(self):
        data = {
            "stock": 1000000,
            "price": Decimal("71.491646"),
            "weekly_average": 100,
            "demand_ratio": Decimal("0.50"),
            "hpp_ratio": Decimal("0.60"),
            "elasticity": Decimal("-2.0"),
        }

        result = optimize_discount(data)

        self.assertIsNone(result)


class ImportTests(TestCase):
    def test_import_clothing_only(self):
        content = (
            "Date,Store ID,Product ID,Category,Region,"
            "Inventory Level,Units Sold,Units Ordered,"
            "Price,Discount,Weather Condition,Promotion,"
            "Competitor Pricing,Seasonality,Epidemic,Demand\n"
            "2023-01-01,S001,P001,Clothing,North,"
            "100,20,30,71.49,15,Sunny,1,75.00,Summer,0,25\n"
            "2023-01-01,S001,P002,Groceries,North,"
            "100,10,20,30.00,5,Sunny,0,35.00,Summer,0,15\n"
        )

        uploaded_file = SimpleUploadedFile(
            "sales_data.csv",
            content.encode("utf-8"),
            content_type="text/csv",
        )

        result = import_retail_csv(uploaded_file)

        self.assertEqual(
            result["source"],
            "sales",
        )

        self.assertEqual(
            result["total_rows"],
            2,
        )

        self.assertEqual(
            result["imported_rows"],
            1,
        )

        self.assertEqual(
            result["ignored_rows"],
            1,
        )

        self.assertEqual(
            result["corrected_forecasts"],
            0,
        )

        self.assertEqual(
            RetailObservation.objects.count(),
            1,
        )

        observation = RetailObservation.objects.first()

        self.assertEqual(
            observation.category,
            "Clothing",
        )

        self.assertEqual(
            observation.units_sold,
            20,
        )

    def test_negative_inventory_forecast(self):
        content = (
            "Date,Store ID,Product ID,Category,Region,"
            "Inventory Level,Units Sold,Units Ordered,"
            "Price,Discount,Holiday/Promotion,"
            "Seasonality,Demand Forecast\n"
            "2023-01-01,S001,P001,Clothing,North,"
            "100,20,30,71.49,15,1,Summer,-3.55\n"
            "2023-01-02,S001,P002,Clothing,North,"
            "90,15,20,70.00,10,0,Summer,18.50\n"
        )

        uploaded_file = SimpleUploadedFile(
            "retail_store_inventory.csv",
            content.encode("utf-8"),
            content_type="text/csv",
        )

        result = import_retail_csv(uploaded_file)

        self.assertEqual(
            result["source"],
            "inventory",
        )

        self.assertEqual(
            result["total_rows"],
            2,
        )

        self.assertEqual(
            result["imported_rows"],
            2,
        )

        self.assertEqual(
            result["corrected_forecasts"],
            1,
        )

        self.assertEqual(
            RetailObservation.objects.filter(
                source="inventory"
            ).count(),
            2,
        )

        first_observation = RetailObservation.objects.get(
            product_id="P001"
        )

        second_observation = RetailObservation.objects.get(
            product_id="P002"
        )

        self.assertEqual(
            first_observation.demand_value,
            Decimal("0"),
        )

        self.assertEqual(
            second_observation.demand_value,
            Decimal("18.50"),
        )

    def test_negative_sales_demand_is_rejected(self):
        content = (
            "Date,Store ID,Product ID,Category,Region,"
            "Inventory Level,Units Sold,Units Ordered,"
            "Price,Discount,Promotion,Seasonality,Demand\n"
            "2023-01-01,S001,P001,Clothing,North,"
            "100,20,30,71.49,15,1,Summer,-5\n"
        )

        uploaded_file = SimpleUploadedFile(
            "sales_data.csv",
            content.encode("utf-8"),
            content_type="text/csv",
        )

        with self.assertRaisesRegex(
            ValueError,
            "Permintaan tidak boleh negatif",
        ):
            import_retail_csv(uploaded_file)

        self.assertEqual(
            RetailObservation.objects.count(),
            0,
        )