from itertools import product

DEFAULT_DISCOUNTS = (
    0, 5, 10, 15, 20, 25
)

FIXED_COMPARISON_DISCOUNT = 20

def _simulate_plan(
    plan,
    stock,
    reference_price,
    unit_cost,
    weekly_base_demand,
    elasticity,
):
    remaining = int(stock)
    total_profit = 0.0
    schedule = []

    for week_number, discount in enumerate(
        plan,
        start=1,
    ):
        selling_price = (
            reference_price * (1 - discount / 100)
        )

        price_ratio = (
            selling_price / reference_price
        )

        expected_demand = int(
            round(
                weekly_base_demand
                * (price_ratio ** elasticity)
            )
        )

        expected_demand = max(
            0,
            expected_demand,
        )

        sold = min(
            remaining,
            expected_demand,
        )

        remaining -= sold

        unit_margin = (
            selling_price - unit_cost
        )

        weekly_profit = (
            unit_margin * sold
        )

        total_profit += weekly_profit

        schedule.append({
            "week": week_number,
            "discount": int(discount),
            "selling_price": round(selling_price, 2),
            "expected_demand": expected_demand,
            "estimated_sold": int(sold),
            "remaining_stock": int(remaining),
            "unit_margin": round(unit_margin, 2),
            "gross_profit": round(weekly_profit, 2),
        })

    return {
        "plan": [int(value) for value in plan],
        "schedule": schedule,
        "remaining": int(remaining),
        "total_sold": int(stock - remaining),
        "total_profit": round(total_profit, 2),
    }

def optimize_markdown(
    stock,
    reference_price,
    unit_cost_ratio,
    weekly_average_units_sold,
    demand_ratio,
    elasticity,
    weeks=4,
    discount_options=DEFAULT_DISCOUNTS,
):
    if stock <= 0:
        raise ValueError(
            "Stok awal harus lebih dari nol."
        )

    if reference_price <= 0:
        raise ValueError(
            "Harga referensi harus lebih dari nol."
        )

    if not 0 <= unit_cost_ratio < 1:
        raise ValueError(
            "Rasio harga pokok harus berada pada rentang 0 sampai kurang dari 1."
        )

    if weekly_average_units_sold <= 0:
        raise ValueError(
            "Rata-rata penjualan mingguan harus lebih dari nol."
        )

    if demand_ratio <= 0:
        raise ValueError(
            "Faktor permintaan harus lebih dari nol."
        )

    if elasticity >= 0:
        raise ValueError(
            "Elastisitas yang dipakai simulasi harus bernilai negatif."
        )

    if not 1 <= weeks <= 6:
        raise ValueError(
            "Horizon simulasi harus berada pada rentang 1 sampai 6 minggu."
        )

    options = sorted({
        int(value)
        for value in discount_options
        if 0 <= int(value) <= 80
    })

    if len(options) < 2:
        raise ValueError(
            "Pilih minimal dua alternatif diskon."
        )

    unit_cost = (
        reference_price * unit_cost_ratio
    )

    weekly_base_demand = (
        weekly_average_units_sold * demand_ratio
    )

    best_feasible = None
    best_fallback = None

    feasible_count = 0

    tested_count = (
        len(options) ** weeks
    )

    for plan in product(
        options,
        repeat=weeks,
    ):
        result = _simulate_plan(
            plan,
            stock,
            reference_price,
            unit_cost,
            weekly_base_demand,
            elasticity,
        )

        if (
            best_fallback is None
            or result["remaining"] < best_fallback["remaining"]
            or (
                result["remaining"] == best_fallback["remaining"]
                and result["total_profit"] > best_fallback["total_profit"]
            )
        ):
            best_fallback = result

        if result["remaining"] == 0:
            feasible_count += 1

            if (
                best_feasible is None
                or result["total_profit"] > best_feasible["total_profit"]
            ):
                best_feasible = result

    best = best_feasible or best_fallback

    fixed_plan = _simulate_plan(
        [FIXED_COMPARISON_DISCOUNT] * weeks,
        stock,
        reference_price,
        unit_cost,
        weekly_base_demand,
        elasticity,
    )

    profit_improvement = None
    improvement_percent = None

    if fixed_plan["remaining"] == 0:
        profit_improvement = round(
            best["total_profit"]
            - fixed_plan["total_profit"],
            2,
        )

        if fixed_plan["total_profit"] != 0:
            improvement_percent = round(
                profit_improvement
                / abs(fixed_plan["total_profit"])
                * 100,
                2,
            )

    return {
        "stock": int(stock),
        "weeks": int(weeks),
        "reference_price": round(reference_price, 2),
        "unit_cost": round(unit_cost, 2),
        "weekly_base_demand": round(
            weekly_base_demand,
            2,
        ),
        "elasticity": round(elasticity, 4),
        "discount_options": options,
        "tested_plans": tested_count,
        "feasible_plans": feasible_count,
        "stock_cleared": best["remaining"] == 0,
        "best_plan": best["plan"],
        "schedule": best["schedule"],
        "total_sold": best["total_sold"],
        "remaining": best["remaining"],
        "total_profit": best["total_profit"],
        "fixed_comparison": {
            "discount": FIXED_COMPARISON_DISCOUNT,
            "plan": fixed_plan["plan"],
            "stock_cleared": fixed_plan["remaining"] == 0,
            "remaining": fixed_plan["remaining"],
            "total_profit": fixed_plan["total_profit"],
            "profit_improvement": profit_improvement,
            "improvement_percent": improvement_percent,
        },
        "status": (
            "optimal_feasible_plan"
            if best_feasible is not None
            else "target_not_reached"
        ),
        "interpretation": (
            "Seluruh stok habis pada akhir periode dalam simulasi."
            if best_feasible is not None
            else "Alternatif diskon yang diuji belum mampu menghabiskan seluruh stok."
        ),
    }