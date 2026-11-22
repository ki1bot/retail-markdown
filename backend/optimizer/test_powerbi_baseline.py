from decimal import Decimal

from django.test import SimpleTestCase

from .services import optimize_discount

class PowerBIBaselineAlignmentTests(SimpleTestCase):
    def test_four_week_baseline_matches_report(self):
        result = optimize_discount({
            "stock": 30000,
            "price": Decimal("71.4916455479"),
            "weekly_average": 10523,
            "demand_ratio": Decimal("0.50"),
            "hpp_ratio": Decimal("0.60"),
            "elasticity": Decimal("-2.0"),
        })

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

        self.assertEqual(
            result["comparison"]["fixed_plan_profit"],
            "428949.87",
        )

        self.assertEqual(
            result["comparison"]["profit_improvement"],
            "78090.32",
        )

        self.assertEqual(
            result["comparison"]["improvement_percent"],
            "18.20",
        )