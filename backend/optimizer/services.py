from decimal import Decimal, ROUND_HALF_UP
from itertools import product


DISCOUNT_OPTIONS = (0, 5, 10, 15, 20, 25)
TARGET_WEEKS = 4
ELASTICITY = -2


def round_units(value):
    return int(
        value.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP
        )
    )


def round_money(value):
    return str(
        value.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )
    )


def calculate_plan(plan, stock, price, base_demand, hpp_ratio):
    remaining = stock
    total_profit = Decimal("0")
    schedule = []

    hpp = price * hpp_ratio

    for week, discount in enumerate(plan, start=1):
        discount_rate = Decimal(discount) / Decimal("100")
        price_factor = Decimal("1") - discount_rate

        demand = round_units(
            base_demand / (price_factor ** abs(ELASTICITY))
        )

        sold = min(remaining, demand)
        remaining -= sold

        selling_price = price * price_factor
        margin = selling_price - hpp
        weekly_profit = Decimal(sold) * margin

        total_profit += weekly_profit

        schedule.append(
            {
                "week": week,
                "discount": discount,
                "demand": demand,
                "sold": sold,
                "remaining": remaining,
                "profit": round_money(weekly_profit),
            }
        )

    return {
        "plan": list(plan),
        "schedule": schedule,
        "remaining": remaining,
        "total_sold": stock - remaining,
        "total_profit_raw": total_profit,
    }


def optimize_discount(data):
    stock = data["stock"]
    price = data["price"]
    weekly_average = data["weekly_average"]
    demand_ratio = data["demand_ratio"]
    hpp_ratio = data["hpp_ratio"]

    base_demand = Decimal(weekly_average) * demand_ratio

    best_plan = None
    feasible_plans = 0

    combinations = product(
        DISCOUNT_OPTIONS,
        repeat=TARGET_WEEKS
    )

    for combination in combinations:
        result = calculate_plan(
            combination,
            stock,
            price,
            base_demand,
            hpp_ratio
        )

        if result["remaining"] != 0:
            continue

        feasible_plans += 1

        if (
            best_plan is None
            or result["total_profit_raw"] > best_plan["total_profit_raw"]
        ):
            best_plan = result

    if best_plan is None:
        return None

    fixed_plan = calculate_plan(
        (20, 20, 20, 20),
        stock,
        price,
        base_demand,
        hpp_ratio
    )

    improvement = None

    if fixed_plan["remaining"] == 0:
        improvement = (
            best_plan["total_profit_raw"]
            - fixed_plan["total_profit_raw"]
        )

    return {
        "stock": stock,
        "target_weeks": TARGET_WEEKS,
        "elasticity": ELASTICITY,
        "discount_options": list(DISCOUNT_OPTIONS),
        "tested_plans": len(DISCOUNT_OPTIONS) ** TARGET_WEEKS,
        "feasible_plans": feasible_plans,
        "base_demand": round_units(base_demand),
        "best_plan": best_plan["plan"],
        "schedule": best_plan["schedule"],
        "total_sold": best_plan["total_sold"],
        "remaining": best_plan["remaining"],
        "total_profit": round_money(
            best_plan["total_profit_raw"]
        ),
        "comparison": {
            "fixed_discount": 20,
            "fixed_plan_feasible": fixed_plan["remaining"] == 0,
            "fixed_plan_profit": round_money(
                fixed_plan["total_profit_raw"]
            ),
            "profit_improvement": (
                round_money(improvement)
                if improvement is not None
                else None
            ),
        },
        "model_status": "simulation_based_on_assumptions",
    }