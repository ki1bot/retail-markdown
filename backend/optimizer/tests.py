from django.test import SimpleTestCase

from .optimization import optimize_markdown

class MarkdownOptimizationTests(SimpleTestCase):

    def test_optimizer_finds_feasible_plan(self):
        result = optimize_markdown(
            stock=1000,
            reference_price=100,
            unit_cost_ratio=0.6,
            weekly_average_units_sold=1000,
            demand_ratio=0.5,
            elasticity=-2.0,
            weeks=4,
            discount_options=[
                0, 5, 10, 15, 20, 25
            ],
        )

        self.assertTrue(
            result["stock_cleared"]
        )

        self.assertEqual(
            result["remaining"],
            0,
        )

        self.assertEqual(
            result["total_sold"],
            1000,
        )

        self.assertEqual(
            result["tested_plans"],
            1296,
        )

        self.assertGreater(
            result["feasible_plans"],
            0,
        )

    def test_optimizer_reports_unreachable_target(self):
        result = optimize_markdown(
            stock=1_000_000,
            reference_price=100,
            unit_cost_ratio=0.6,
            weekly_average_units_sold=10,
            demand_ratio=0.1,
            elasticity=-2.0,
            weeks=2,
            discount_options=[
                0, 5, 10, 15, 20, 25
            ],
        )

        self.assertFalse(
            result["stock_cleared"]
        )

        self.assertGreater(
            result["remaining"],
            0,
        )

        self.assertEqual(
            result["status"],
            "target_not_reached",
        )