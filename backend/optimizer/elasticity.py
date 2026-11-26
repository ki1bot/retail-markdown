import numpy as np

from .datasets import get_clothing_sales

ASSUMED_ELASTICITY = -2.0
MIN_R2_FOR_USE = 0.10

def _r_squared(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    if len(actual) < 2:
        return 0.0

    total = float(
        np.sum((actual - np.mean(actual)) ** 2)
    )

    residual = float(
        np.sum((actual - predicted) ** 2)
    )

    if total <= 0:
        return 0.0

    return 1 - residual / total

def _fit_log_log(train):
    x = np.log(
        train["Effective Price"].to_numpy(dtype=float)
    )

    y = np.log(
        train["Demand"].to_numpy(dtype=float)
    )

    design = np.column_stack([
        np.ones(len(x)),
        x,
    ])

    coefficients, _, _, _ = np.linalg.lstsq(
        design,
        y,
        rcond=None,
    )

    predictions = design @ coefficients

    return (
        float(coefficients[1]),
        predictions,
        y,
    )

def estimate_price_elasticity(year=2023):
    frame = get_clothing_sales(year)

    frame = frame[
        (frame["Demand"] > 0)
        & (frame["Effective Price"] > 0)
    ].sort_values("Date")

    if len(frame) < 20:
        raise ValueError(
            "Jumlah observasi positif terlalu sedikit untuk regresi Log-Log."
        )

    split_index = max(
        10,
        int(len(frame) * 0.8),
    )

    split_index = min(
        split_index,
        len(frame) - 5,
    )

    train = frame.iloc[:split_index]
    test = frame.iloc[split_index:]

    elasticity, train_predictions, train_actual = (
        _fit_log_log(train)
    )

    train_x = np.log(
        train["Effective Price"].to_numpy(dtype=float)
    )

    train_design = np.column_stack([
        np.ones(len(train_x)),
        train_x,
    ])

    coefficients, _, _, _ = np.linalg.lstsq(
        train_design,
        train_actual,
        rcond=None,
    )

    test_x = np.log(
        test["Effective Price"].to_numpy(dtype=float)
    )

    test_y = np.log(
        test["Demand"].to_numpy(dtype=float)
    )

    test_design = np.column_stack([
        np.ones(len(test_x)),
        test_x,
    ])

    test_predictions = test_design @ coefficients

    train_r2 = _r_squared(
        train_actual,
        train_predictions,
    )

    test_r2 = _r_squared(
        test_y,
        test_predictions,
    )

    reliable = (
        elasticity < 0
        and train_r2 >= MIN_R2_FOR_USE
        and test_r2 >= 0
    )

    applied_elasticity = (
        elasticity
        if reliable
        else ASSUMED_ELASTICITY
    )

    if reliable:
        explanation = (
            "Koefisien negatif dan kualitas model melewati "
            "ambang evaluasi. Elastisitas hasil regresi dipakai "
            "dalam simulasi."
        )

    elif elasticity >= 0:
        explanation = (
            "Koefisien regresi bernilai positif, sehingga "
            "arahnya tidak sesuai dengan hubungan harga dan "
            "permintaan yang diharapkan. Simulasi memakai "
            "asumsi elastisitas -2,0 dari makalah."
        )

    else:
        explanation = (
            f"R² training {train_r2:.4f} belum mencapai "
            f"ambang {MIN_R2_FOR_USE:.2f}. Simulasi memakai "
            "asumsi elastisitas -2,0 dari makalah."
        )

    return {
        "model_name": "Regresi Log-Log",
        "source_file": "sales_data.csv",
        "category": "Clothing",
        "year": int(year),
        "sample_size": int(len(frame)),
        "train_size": int(len(train)),
        "test_size": int(len(test)),
        "equation": (
            "ln(Demand) = β0 + β1 × ln(Harga Aktual) + ε"
        ),
        "elasticity_estimated": round(
            elasticity,
            4,
        ),
        "train_r2": round(train_r2, 4),
        "test_r2": round(test_r2, 4),
        "reliable": bool(reliable),
        "elasticity_used": round(
            float(applied_elasticity),
            2,
        ),
        "assumed_elasticity": ASSUMED_ELASTICITY,
        "r2_threshold": MIN_R2_FOR_USE,
        "explanation": explanation,
        "reference_price": round(
            float(frame["Price"].mean()),
            2,
        ),
        "average_effective_price": round(
            float(frame["Effective Price"].mean()),
            2,
        ),
        "weekly_average_units_sold": round(
            float(
                frame.groupby(
                    frame["Date"].dt.to_period("W")
                )["Units Sold"].sum().mean()
            ),
            2,
        ),
        "weekly_average_demand": round(
            float(
                frame.groupby(
                    frame["Date"].dt.to_period("W")
                )["Demand"].sum().mean()
            ),
            2,
        ),
        "evaluation_note": (
            "Data dibagi berdasarkan waktu. 80% periode awal "
            "digunakan untuk pelatihan dan 20% periode akhir "
            "digunakan untuk pengujian."
        ),
    }