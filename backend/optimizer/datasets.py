from functools import lru_cache
from pathlib import Path
import os
import csv

import pandas as pd
from django.conf import settings

DATASET_FILES = {
    "fashion_boutique": "fashion_boutique_dataset.csv",
    "retail_inventory_apl": "retail_inventory_ml_apl.csv",
    "retail_sales_apl": "retail_sales_ml_apl.csv",
    "retail_store_inventory": "retail_store_inventory.csv",
    "sales_data": "sales_data.csv",
}

DATASET_INFO = {
    "fashion_boutique": {
        "label": "Fashion Boutique",
        "role": "Katalog produk dan stok pakaian",
        "description": "Harga normal, harga saat ini, markdown, kategori, dan stok produk.",
        "date_column": "purchase_date",
    },
    "retail_inventory_apl": {
        "label": "Retail Inventory APL",
        "role": "Persediaan dan harga pokok",
        "description": "Stok, harga jual satuan, biaya satuan, dan status stok.",
        "date_column": "Start Date",
    },
    "retail_sales_apl": {
        "label": "Retail Sales APL",
        "role": "Transaksi penjualan dan retur",
        "description": "Transaksi, kuantitas, nilai penjualan, COGS, dan jenis harga.",
        "date_column": "Transaction Date",
    },
    "retail_store_inventory": {
        "label": "Retail Store Inventory",
        "role": "Pembanding penjualan dan persediaan",
        "description": "Unit terjual, demand forecast, stok, harga, dan diskon.",
        "date_column": "Date",
    },
    "sales_data": {
        "label": "Sales Data",
        "role": "Sumber utama model elastisitas Clothing",
        "description": "Demand, Units Sold, stok, harga, diskon, promosi, dan seasonality.",
        "date_column": "Date",
    },
}

REQUIRED_COLUMNS = {
    "fashion_boutique": {
        "product_id", "category", "original_price",
        "markdown_percentage", "current_price",
        "purchase_date", "stock_quantity",
    },
    "retail_inventory_apl": {
        "Start Date", "End Date", "Stock Status",
        "Product No", "Store", "Product Division",
        "Qty on hand", "Stock Unit Selling Price",
        "Stock Unit Cost Price",
    },
    "retail_sales_apl": {
        "Transaction Date", "Sales Type", "Is Return",
        "Product No", "Product Division", "Store",
        "Qty Sold", "Sales Amount", "Cogs",
    },
    "retail_store_inventory": {
        "Date", "Store ID", "Product ID", "Category",
        "Inventory Level", "Units Sold",
        "Demand Forecast", "Price", "Discount",
    },
    "sales_data": {
        "Date", "Store ID", "Product ID", "Category",
        "Inventory Level", "Units Sold",
        "Price", "Discount", "Demand",
    },
}

DATASET_NOTES = {
    "fashion_boutique": [
        "Tidak memiliki jumlah penjualan historis, sehingga tidak digunakan untuk melatih elastisitas.",
        "Ukuran kosong pada sebagian produk tidak menghalangi analisis stok agregat.",
    ],
    "retail_inventory_apl": [
        "End Date 9999-12-31 diperlakukan sebagai tanggal akhir terbuka.",
        "Junior Apparel dipisahkan dari kelompok footwear.",
    ],
    "retail_sales_apl": [
        "Retur memiliki Qty Sold negatif dan dipisahkan dari penjualan positif.",
        "Junior Apparel dianalisis sebagai kelompok apparel.",
    ],
    "retail_store_inventory": [
        "Demand Forecast merupakan perkiraan, bukan permintaan aktual.",
        "Tidak digabung dengan sales_data karena observasi dengan ID sama memiliki nilai berbeda.",
    ],
    "sales_data": [
        "Model utama hanya memakai baris Category = Clothing.",
        "Demand digunakan untuk regresi.",
        "Units Sold digunakan untuk rata-rata penjualan mingguan.",
        "Product ID muncul pada beberapa kategori sehingga filter dilakukan pada tingkat baris.",
    ],
}

def dataset_directory():
    return Path(
        getattr(
            settings,
            "DATASET_DIR",
            os.environ.get("DATASET_DIR", "/data"),
        )
    )

@lru_cache(maxsize=10)
def _read_csv_cached(path_string, modified_ns, file_size):
    return pd.read_csv(
        path_string,
        low_memory=False,
    )

def clear_dataset_cache():
    _read_csv_cached.cache_clear()

def load_dataset(key):
    if key not in DATASET_FILES:
        raise ValueError("Dataset tidak dikenal.")

    path = dataset_directory() / DATASET_FILES[key]

    if not path.is_file():
        raise FileNotFoundError(
            f"File {DATASET_FILES[key]} belum tersedia di folder data."
        )

    stat = path.stat()

    frame = _read_csv_cached(
        str(path),
        stat.st_mtime_ns,
        stat.st_size,
    )

    missing = REQUIRED_COLUMNS[key] - set(frame.columns)

    if missing:
        raise ValueError(
            f"Kolom wajib pada {DATASET_FILES[key]} belum lengkap: "
            + ", ".join(sorted(missing))
        )

    return frame

def validate_dataset_header(key, uploaded_file):
    if key not in REQUIRED_COLUMNS:
        raise ValueError("Jenis dataset tidak dikenal.")

    uploaded_file.seek(0)
    first_line = uploaded_file.readline()
    uploaded_file.seek(0)

    if isinstance(first_line, bytes):
        try:
            first_line = first_line.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError(
                "CSV harus menggunakan encoding UTF-8."
            ) from exc

    try:
        header = next(csv.reader([first_line]))
    except (csv.Error, StopIteration) as exc:
        raise ValueError("Header CSV tidak dapat dibaca.") from exc

    columns = {
        str(value).strip()
        for value in header
    }

    missing = REQUIRED_COLUMNS[key] - columns

    if missing:
        raise ValueError(
            "Struktur kolom tidak sesuai. Kolom yang belum ada: "
            + ", ".join(sorted(missing))
        )

def _safe_date_range(frame, column):
    if column not in frame.columns:
        return None, None

    dates = pd.to_datetime(
        frame[column],
        errors="coerce",
    ).dropna()

    if dates.empty:
        return None, None

    return (
        dates.min().date().isoformat(),
        dates.max().date().isoformat(),
    )

def _status_for_dataset(key):
    meta = DATASET_INFO[key]

    try:
        frame = load_dataset(key)

    except FileNotFoundError:
        return {
            "key": key,
            "label": meta["label"],
            "filename": DATASET_FILES[key],
            "role": meta["role"],
            "description": meta["description"],
            "available": False,
            "rows": 0,
            "period_start": None,
            "period_end": None,
            "metrics": {},
            "error": None,
            "notes": DATASET_NOTES[key],
        }

    except Exception as exc:
        return {
            "key": key,
            "label": meta["label"],
            "filename": DATASET_FILES[key],
            "role": meta["role"],
            "description": meta["description"],
            "available": False,
            "rows": 0,
            "period_start": None,
            "period_end": None,
            "metrics": {},
            "error": str(exc),
            "notes": DATASET_NOTES[key],
        }

    rows = len(frame)

    start, end = _safe_date_range(
        frame,
        meta["date_column"],
    )

    metrics = {}

    if key == "fashion_boutique":
        metrics = {
            "products": int(frame["product_id"].nunique()),
            "stock_units": int(
                pd.to_numeric(
                    frame["stock_quantity"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
            "average_markdown": round(
                float(
                    pd.to_numeric(
                        frame["markdown_percentage"],
                        errors="coerce",
                    ).mean()
                ),
                2,
            ),
            "categories": int(frame["category"].nunique()),
            "missing_size": int(frame["size"].isna().sum()),
        }

    elif key == "retail_inventory_apl":
        apparel = frame[
            frame["Product Division"].astype(str).str.strip()
            .eq("Junior Apparel")
        ]

        stock = pd.to_numeric(
            apparel["Qty on hand"],
            errors="coerce",
        ).fillna(0)

        metrics = {
            "products": int(frame["Product No"].nunique()),
            "stores": int(frame["Store"].nunique()),
            "junior_apparel_rows": int(len(apparel)),
            "junior_apparel_stock": int(stock.sum()),
            "stock_units": int(
                pd.to_numeric(
                    frame["Qty on hand"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
            "stock_statuses": int(frame["Stock Status"].nunique()),
        }

        finite_end = pd.to_datetime(
            frame["End Date"],
            errors="coerce",
        )

        finite_end = finite_end[
            finite_end.dt.year < 2100
        ]

        if not finite_end.empty:
            end = finite_end.max().date().isoformat()

    elif key == "retail_sales_apl":
        apparel = frame[
            frame["Product Division"].astype(str).str.strip()
            .eq("Junior Apparel")
        ]

        qty = pd.to_numeric(
            apparel["Qty Sold"],
            errors="coerce",
        ).fillna(0)

        sales = pd.to_numeric(
            apparel["Sales Amount"],
            errors="coerce",
        ).fillna(0)

        cogs = pd.to_numeric(
            apparel["Cogs"],
            errors="coerce",
        ).fillna(0)

        metrics = {
            "products": int(frame["Product No"].nunique()),
            "stores": int(frame["Store"].nunique()),
            "junior_apparel_rows": int(len(apparel)),
            "junior_apparel_units_net": round(float(qty.sum()), 2),
            "junior_apparel_return_rows": int((qty < 0).sum()),
            "junior_apparel_sales_value": round(
                float(sales[qty > 0].sum()),
                2,
            ),
            "junior_apparel_cogs": round(
                float(cogs[qty > 0].sum()),
                2,
            ),
        }

    elif key == "retail_store_inventory":
        clothing = frame[
            frame["Category"].astype(str).str.strip().str.lower()
            .eq("clothing")
        ]

        metrics = {
            "products": int(clothing["Product ID"].nunique()),
            "stores": int(clothing["Store ID"].nunique()),
            "clothing_rows": int(len(clothing)),
            "units_sold": int(
                pd.to_numeric(
                    clothing["Units Sold"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
            "demand_forecast": round(
                float(
                    pd.to_numeric(
                        clothing["Demand Forecast"],
                        errors="coerce",
                    ).fillna(0).sum()
                ),
                2,
            ),
            "stock_units": int(
                pd.to_numeric(
                    clothing["Inventory Level"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
        }

    elif key == "sales_data":
        clothing = frame[
            frame["Category"].astype(str).str.strip().str.lower()
            .eq("clothing")
        ]

        metrics = {
            "products": int(clothing["Product ID"].nunique()),
            "stores": int(clothing["Store ID"].nunique()),
            "clothing_rows": int(len(clothing)),
            "units_sold": int(
                pd.to_numeric(
                    clothing["Units Sold"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
            "demand": int(
                pd.to_numeric(
                    clothing["Demand"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
            "stock_units": int(
                pd.to_numeric(
                    clothing["Inventory Level"],
                    errors="coerce",
                ).fillna(0).sum()
            ),
        }

    return {
        "key": key,
        "label": meta["label"],
        "filename": DATASET_FILES[key],
        "role": meta["role"],
        "description": meta["description"],
        "available": True,
        "rows": int(rows),
        "period_start": start,
        "period_end": end,
        "metrics": metrics,
        "error": None,
        "notes": DATASET_NOTES[key],
    }

def get_dataset_status():
    return {
        key: _status_for_dataset(key)
        for key in DATASET_FILES
    }

def get_available_years():
    frame = load_dataset("sales_data")

    dates = pd.to_datetime(
        frame["Date"],
        errors="coerce",
    )

    return sorted(
        int(year)
        for year in dates.dropna().dt.year.unique()
    )

def get_clothing_sales(year=None):
    frame = load_dataset("sales_data").copy()

    frame["Date"] = pd.to_datetime(
        frame["Date"],
        errors="coerce",
    )

    numeric_columns = [
        "Inventory Level",
        "Units Sold",
        "Price",
        "Discount",
        "Competitor Pricing",
        "Demand",
    ]

    for column in numeric_columns:
        frame[column] = pd.to_numeric(
            frame[column],
            errors="coerce",
        )

    frame = frame[
        frame["Category"].astype(str).str.strip().str.lower()
        .eq("clothing")
    ].copy()

    if year is not None:
        frame = frame[
            frame["Date"].dt.year.eq(int(year))
        ].copy()

    frame = frame.dropna(
        subset=[
            "Date",
            "Units Sold",
            "Price",
            "Discount",
            "Demand",
        ]
    )

    frame["Effective Price"] = (
        frame["Price"] * (1 - frame["Discount"] / 100)
    )

    frame = frame[
        (frame["Effective Price"] > 0)
        & (frame["Price"] > 0)
        & (frame["Demand"] >= 0)
        & (frame["Units Sold"] >= 0)
    ].copy()

    return frame

def _weekly_average(frame, column):
    if frame.empty:
        return 0.0

    weekly = frame.groupby(
        frame["Date"].dt.to_period("W")
    )[column].sum()

    return float(weekly.mean()) if not weekly.empty else 0.0

def get_dashboard_summary(year=2023):
    frame = get_clothing_sales(year)

    all_sales = load_dataset("sales_data")

    all_dates = pd.to_datetime(
        all_sales["Date"],
        errors="coerce",
    )

    available_years = sorted(
        int(value)
        for value in all_dates.dropna().dt.year.unique()
    )

    if frame.empty:
        return {
            "available": False,
            "year": int(year),
            "available_years": available_years,
            "rows": 0,
            "monthly": [],
        }

    latest_date = frame["Date"].max()

    latest_rows = frame[
        frame["Date"].eq(latest_date)
    ]

    weekly_average_units_sold = _weekly_average(
        frame,
        "Units Sold",
    )

    weekly_average_demand = _weekly_average(
        frame,
        "Demand",
    )

    monthly = (
        frame.assign(month=frame["Date"].dt.month)
        .groupby("month")
        .agg(
            units_sold=("Units Sold", "sum"),
            demand=("Demand", "sum"),
            average_discount=("Discount", "mean"),
        )
        .reset_index()
        .to_dict(orient="records")
    )

    estimated_revenue = (
        frame["Effective Price"] * frame["Units Sold"]
    ).sum()

    full_product_map = all_sales.groupby(
        "Product ID"
    )["Category"].nunique()

    product_category_conflicts = int(
        (full_product_map > 1).sum()
    )

    return {
        "available": True,
        "year": int(year),
        "available_years": available_years,
        "rows": int(len(frame)),
        "stores": int(frame["Store ID"].nunique()),
        "products": int(frame["Product ID"].nunique()),
        "date_start": frame["Date"].min().date().isoformat(),
        "date_end": frame["Date"].max().date().isoformat(),
        "units_sold": int(frame["Units Sold"].sum()),
        "demand": int(frame["Demand"].sum()),
        "latest_date": latest_date.date().isoformat(),
        "latest_stock": int(latest_rows["Inventory Level"].sum()),
        "average_price": round(float(frame["Price"].mean()), 2),
        "average_effective_price": round(
            float(frame["Effective Price"].mean()),
            2,
        ),
        "average_discount": round(
            float(frame["Discount"].mean()),
            2,
        ),
        "weekly_average_units_sold": round(
            weekly_average_units_sold,
            2,
        ),
        "weekly_average_demand": round(
            weekly_average_demand,
            2,
        ),
        "estimated_revenue": round(
            float(estimated_revenue),
            2,
        ),
        "monthly": [
            {
                "month": int(item["month"]),
                "units_sold": int(item["units_sold"]),
                "demand": int(item["demand"]),
                "average_discount": round(
                    float(item["average_discount"]),
                    2,
                ),
            }
            for item in monthly
        ],
        "quality": {
            "missing_values": int(frame.isna().sum().sum()),
            "duplicate_rows": int(frame.duplicated().sum()),
            "product_ids_in_multiple_categories": product_category_conflicts,
        },
    }