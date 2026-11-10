import csv
import io

from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .models import RetailObservation


COMMON_COLUMNS = {
    "Date",
    "Store ID",
    "Product ID",
    "Category",
    "Region",
    "Inventory Level",
    "Units Sold",
    "Units Ordered",
    "Price",
    "Discount",
    "Seasonality",
}

MAX_ROWS = 100000


def detect_source(columns):
    if "Demand" in columns and "Promotion" in columns:
        return "sales"

    if (
        "Demand Forecast" in columns
        and "Holiday/Promotion" in columns
    ):
        return "inventory"

    raise ValueError(
        "Format CSV tidak didukung. Gunakan sales_data.csv "
        "atau retail_store_inventory.csv."
    )


def parse_nonnegative_int(value, field):
    number = int(value)

    if number < 0:
        raise ValueError(
            f"Nilai {field} tidak boleh negatif."
        )

    return number


def parse_observation(row, source):
    demand_column = (
        "Demand"
        if source == "sales"
        else "Demand Forecast"
    )

    promotion_column = (
        "Promotion"
        if source == "sales"
        else "Holiday/Promotion"
    )

    price = Decimal(row["Price"])
    demand = Decimal(row[demand_column])

    discount = parse_nonnegative_int(
        row["Discount"],
        "Discount",
    )

    if not price.is_finite() or price <= 0:
        raise ValueError(
            "Harga produk harus lebih dari nol."
        )

    if not demand.is_finite():
        raise ValueError(
            "Nilai permintaan tidak valid."
        )

    corrected_forecast = False

    if demand < 0:
        if source == "inventory":
            demand = Decimal("0")
            corrected_forecast = True
        else:
            raise ValueError(
                "Permintaan tidak boleh negatif."
            )

    if discount > 100:
        raise ValueError(
            "Persentase diskon tidak boleh melebihi 100."
        )

    observation = RetailObservation(
        source=source,
        observed_on=date.fromisoformat(
            row["Date"]
        ),
        store_id=row["Store ID"].strip(),
        product_id=row["Product ID"].strip(),
        category=row["Category"].strip(),
        region=row["Region"].strip(),
        inventory_level=parse_nonnegative_int(
            row["Inventory Level"],
            "Inventory Level",
        ),
        units_sold=parse_nonnegative_int(
            row["Units Sold"],
            "Units Sold",
        ),
        units_ordered=parse_nonnegative_int(
            row["Units Ordered"],
            "Units Ordered",
        ),
        demand_value=demand,
        price=price,
        discount=discount,
        seasonality=row["Seasonality"].strip(),
        promotion=(
            row[promotion_column].strip() == "1"
        ),
    )

    return observation, corrected_forecast


def import_retail_csv(uploaded_file):
    if not uploaded_file.name.lower().endswith(".csv"):
        raise ValueError(
            "File harus menggunakan format CSV."
        )

    if uploaded_file.size > 12000000:
        raise ValueError(
            "Ukuran file melebihi batas 12 MB."
        )

    if uploaded_file.size == 0:
        raise ValueError(
            "File CSV kosong."
        )

    stream = io.TextIOWrapper(
        uploaded_file.file,
        encoding="utf-8-sig",
        newline="",
    )

    try:
        reader = csv.DictReader(stream)

        columns = set(
            reader.fieldnames or []
        )

        if not COMMON_COLUMNS.issubset(columns):
            raise ValueError(
                "Kolom CSV tidak sesuai dengan dataset ritel."
            )

        source = detect_source(columns)

        observations = []
        total_rows = 0
        corrected_forecasts = 0

        for row in reader:
            total_rows += 1

            if total_rows > MAX_ROWS:
                raise ValueError(
                    "Dataset melebihi batas 100.000 baris."
                )

            if (
                row.get("Category", "")
                .strip()
                .lower()
                != "clothing"
            ):
                continue

            try:
                observation, was_corrected = parse_observation(
                    row,
                    source,
                )
            except (
                ValueError,
                KeyError,
                TypeError,
                InvalidOperation,
            ) as exc:
                raise ValueError(
                    f"Data tidak valid pada baris "
                    f"{total_rows + 1}: {exc}"
                ) from exc

            observations.append(observation)

            if was_corrected:
                corrected_forecasts += 1

    except UnicodeDecodeError as exc:
        raise ValueError(
            "CSV harus menggunakan encoding UTF-8."
        ) from exc

    if not observations:
        raise ValueError(
            "Tidak ditemukan data kategori Clothing."
        )

    with transaction.atomic():
        RetailObservation.objects.filter(
            source=source
        ).delete()

        RetailObservation.objects.bulk_create(
            observations,
            batch_size=1000,
        )

    return {
        "source": source,
        "total_rows": total_rows,
        "imported_rows": len(observations),
        "ignored_rows": total_rows - len(observations),
        "corrected_forecasts": corrected_forecasts,
        "message": "Dataset berhasil diimpor.",
    }