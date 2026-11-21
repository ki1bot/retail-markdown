import csv
import io

from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .models import (
    RetailObservation,
    WarehouseSaleObservation,
)

COMMON_COLUMNS = {
    "DATE",
    "STORE ID",
    "PRODUCT ID",
    "CATEGORY",
    "REGION",
    "INVENTORY LEVEL",
    "UNITS SOLD",
    "UNITS ORDERED",
    "PRICE",
    "DISCOUNT",
    "SEASONALITY",
}

WAREHOUSE_SALES_COLUMNS = {
    "YEAR",
    "MONTH",
    "SUPPLIER",
    "ITEM CODE",
    "ITEM DESCRIPTION",
    "ITEM TYPE",
    "RETAIL SALES",
    "RETAIL TRANSFERS",
    "WAREHOUSE SALES",
}

MAX_ROWS = 100000
MAX_FILE_SIZE = 12_000_000

def _read_upload_text(uploaded_file):
    uploaded_file.seek(0)
    raw = uploaded_file.read()
    uploaded_file.seek(0)

    if isinstance(raw, str):
        return raw

    try:
        return raw.decode("utf-8-sig")

    except UnicodeDecodeError as exc:
        raise ValueError(
            "CSV harus menggunakan encoding UTF-8."
        ) from exc

def _validate_upload(uploaded_file):
    filename = getattr(
        uploaded_file,
        "name",
        "",
    )

    size = getattr(
        uploaded_file,
        "size",
        None,
    )

    if not str(filename).lower().endswith(".csv"):
        raise ValueError(
            "File harus menggunakan format CSV."
        )

    if size is not None and size > MAX_FILE_SIZE:
        raise ValueError(
            "Ukuran file melebihi batas 12 MB."
        )

    if size == 0:
        raise ValueError(
            "File CSV kosong."
        )


def _normalise_header(fieldnames):
    return [
        str(name or "").strip()
        for name in (fieldnames or [])
    ]

def _normalise_row(row):
    return {
        str(key).strip().upper(): (
            value or ""
        ).strip()

        for key, value in row.items()
        if key is not None
    }

def detect_source(columns):

    if (
        "DEMAND" in columns
        and "PROMOTION" in columns
    ):
        return "sales"

    if (
        "DEMAND FORECAST" in columns
        and "HOLIDAY/PROMOTION" in columns
    ):
        return "inventory"

    raise ValueError(
        "Format CSV tidak didukung. Gunakan sales_data.csv "
        "atau retail_store_inventory.csv."
    )

def parse_nonnegative_int(value, field):
    try:
        number = int(
            str(value).strip()
        )

    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Nilai {field} harus berupa bilangan bulat."
        ) from exc

    if number < 0:
        raise ValueError(
            f"Nilai {field} tidak boleh negatif."
        )

    return number

def _parse_decimal(
    value,
    field,
    nullable=False,
):

    raw = str(value or "").strip()

    if not raw and nullable:
        return None

    if not raw:
        raise ValueError(
            f"Kolom {field} tidak boleh kosong."
        )

    try:
        number = Decimal(raw)

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Nilai {field} tidak valid."
        ) from exc

    if not number.is_finite():
        raise ValueError(
            f"Nilai {field} harus berupa angka valid."
        )

    return number.quantize(
        Decimal("0.01")
    )

def parse_observation(row, source):
    demand_column = (
        "DEMAND"
        if source == "sales"
        else "DEMAND FORECAST"
    )

    promotion_column = (
        "PROMOTION"
        if source == "sales"
        else "HOLIDAY/PROMOTION"
    )

    try:
        price = _parse_decimal(
            row.get("PRICE"),
            "Price",
        )

        demand = _parse_decimal(
            row.get(demand_column),
            demand_column,
        )

        discount = parse_nonnegative_int(
            row.get("DISCOUNT"),
            "Discount",
        )

        observed_on = date.fromisoformat(
            row.get("DATE", "").strip()
        )

    except (
        ValueError,
        TypeError,
        InvalidOperation,
    ) as exc:
        raise ValueError(str(exc)) from exc

    if price <= 0:
        raise ValueError(
            "Harga produk harus lebih dari nol."
        )

    corrected_forecast = False

    if demand < 0:
        if source == "inventory":
            demand = Decimal("0.00")
            corrected_forecast = True
        else:
            raise ValueError(
                "Permintaan tidak boleh negatif."
            )

    if discount > 100:
        raise ValueError(
            "Persentase diskon tidak boleh melebihi 100."
        )

    store_id = row.get(
        "STORE ID",
        "",
    ).strip()

    product_id = row.get(
        "PRODUCT ID",
        "",
    ).strip()

    category = row.get(
        "CATEGORY",
        "",
    ).strip()

    region = row.get(
        "REGION",
        "",
    ).strip()

    seasonality = row.get(
        "SEASONALITY",
        "",
    ).strip()

    if not all((
        store_id,
        product_id,
        category,
        region,
        seasonality,
    )):
        raise ValueError(
            "Store ID, Product ID, Category, Region, "
            "dan Seasonality tidak boleh kosong."
        )

    observation = RetailObservation(
        source=source,
        observed_on=observed_on,
        store_id=store_id,
        product_id=product_id,
        category=category,
        region=region,
        inventory_level=parse_nonnegative_int(
            row.get("INVENTORY LEVEL"),
            "Inventory Level",
        ),
        units_sold=parse_nonnegative_int(
            row.get("UNITS SOLD"),
            "Units Sold",
        ),
        units_ordered=parse_nonnegative_int(
            row.get("UNITS ORDERED"),
            "Units Ordered",
        ),
        demand_value=demand,
        price=price,
        discount=discount,
        seasonality=seasonality,
        promotion=(
            row.get(
                promotion_column,
                "",
            ).strip() == "1"
        ),
    )

    return observation, corrected_forecast

def import_retail_csv(
    uploaded_file,
    text=None,
):

    _validate_upload(uploaded_file)

    text = (
        text
        if text is not None
        else _read_upload_text(uploaded_file)
    )

    try:
        reader = csv.DictReader(
            io.StringIO(text)
        )

        reader.fieldnames = _normalise_header(
            reader.fieldnames
        )
        columns = {
            name.upper()
            for name in (reader.fieldnames or [])
        }

        if not COMMON_COLUMNS.issubset(columns):
            raise ValueError(
                "Kolom CSV tidak sesuai dengan dataset ritel."
            )

        source = detect_source(columns)

        observations = []
        total_rows = 0
        corrected_forecasts = 0

        for raw_row in reader:

            row = _normalise_row(raw_row)

            if not any(row.values()):
                continue

            total_rows += 1

            if total_rows > MAX_ROWS:
                raise ValueError(
                    "Dataset melebihi batas 100.000 baris."
                )

            if row.get(
                "CATEGORY",
                "",
            ).lower() != "clothing":
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

    except csv.Error as exc:
        raise ValueError(
            f"CSV tidak dapat dibaca: {exc}"
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
            batch_size=2000,
        )

    return {
        "source": source,
        "total_rows": total_rows,
        "imported_rows": len(observations),
        "ignored_rows": (
            total_rows - len(observations)
        ),
        "corrected_forecasts": corrected_forecasts,
        "message": (
            "Dataset Clothing berhasil diimpor."
        ),
    }

def import_warehouse_sales_csv(
    uploaded_file,
    text=None,
):

    _validate_upload(uploaded_file)

    text = (
        text
        if text is not None
        else _read_upload_text(uploaded_file)
    )

    try:
        reader = csv.DictReader(
            io.StringIO(text)
        )

        reader.fieldnames = _normalise_header(
            reader.fieldnames
        )

        columns = {
            name.upper()
            for name in (reader.fieldnames or [])
        }

        if not WAREHOUSE_SALES_COLUMNS.issubset(columns):

            missing = sorted(
                WAREHOUSE_SALES_COLUMNS - columns
            )

            raise ValueError(
                "Struktur Retail and Warehouse Sales tidak sesuai. "
                "Kolom belum tersedia: "
                + ", ".join(missing)
            )

        observations = []

        total_rows = 0

        missing_supplier = 0
        missing_retail_sales = 0

        negative_retail_sales = 0
        negative_retail_transfers = 0
        negative_warehouse_sales = 0

        for raw_row in reader:

            row = _normalise_row(raw_row)

            if not any(row.values()):
                continue

            total_rows += 1

            if total_rows > MAX_ROWS:
                raise ValueError(
                    "Dataset melebihi batas 100.000 baris."
                )

            try:
                year = int(
                    row.get("YEAR", "")
                )

                month = int(
                    row.get("MONTH", "")
                )

                if not 1900 <= year <= 2100:
                    raise ValueError(
                        "YEAR berada di luar rentang yang valid."
                    )

                if not 1 <= month <= 12:
                    raise ValueError(
                        "MONTH harus berada pada rentang 1–12."
                    )

                supplier = row.get(
                    "SUPPLIER",
                    "",
                ).strip()

                item_code = row.get(
                    "ITEM CODE",
                    "",
                ).strip()

                item_description = row.get(
                    "ITEM DESCRIPTION",
                    "",
                ).strip()

                item_type = row.get(
                    "ITEM TYPE",
                    "",
                ).strip()

                if not item_code or not item_description or not item_type:
                    raise ValueError(
                        "ITEM CODE, ITEM DESCRIPTION, dan ITEM TYPE "
                        "tidak boleh kosong."
                    )

                retail_sales = _parse_decimal(
                    row.get("RETAIL SALES"),
                    "RETAIL SALES",
                    nullable=True,
                )

                retail_transfers = _parse_decimal(
                    row.get("RETAIL TRANSFERS"),
                    "RETAIL TRANSFERS",
                )

                warehouse_sales = _parse_decimal(
                    row.get("WAREHOUSE SALES"),
                    "WAREHOUSE SALES",
                )

                if not supplier:
                    missing_supplier += 1

                if retail_sales is None:
                    missing_retail_sales += 1

                elif retail_sales < 0:
                    negative_retail_sales += 1

                if retail_transfers < 0:
                    negative_retail_transfers += 1

                if warehouse_sales < 0:
                    negative_warehouse_sales += 1

                observations.append(
                    WarehouseSaleObservation(
                        year=year,
                        month=month,
                        supplier=supplier,
                        item_code=item_code,
                        item_description=item_description,
                        item_type=item_type,
                        retail_sales=retail_sales,
                        retail_transfers=retail_transfers,
                        warehouse_sales=warehouse_sales,
                    )
                )

            except (
                ValueError,
                TypeError,
                KeyError,
                InvalidOperation,
            ) as exc:

                raise ValueError(
                    f"Kesalahan pada baris "
                    f"{total_rows + 1}: {exc}"
                ) from exc

    except csv.Error as exc:
        raise ValueError(
            f"CSV tidak dapat dibaca: {exc}"
        ) from exc

    if not observations:
        raise ValueError(
            "Tidak ditemukan baris data Retail and Warehouse Sales."
        )

    with transaction.atomic():
        WarehouseSaleObservation.objects.all().delete()
        WarehouseSaleObservation.objects.bulk_create(
            observations,
            batch_size=2000,
        )

    return {
        "source": "warehouse_sales",
        "total_rows": total_rows,
        "imported_rows": len(observations),
        "ignored_rows": 0,
        "missing_supplier": missing_supplier,
        "missing_retail_sales": missing_retail_sales,
        "negative_retail_sales": negative_retail_sales,
        "negative_retail_transfers": negative_retail_transfers,
        "negative_warehouse_sales": negative_warehouse_sales,

        "years": sorted({
            item.year
            for item in observations
        }),
        "months": sorted({
            item.month
            for item in observations
        }),
        "message": (
            "Retail and Warehouse Sales berhasil diimpor "
            "sebagai dataset terpisah."
        ),
    }

def import_dataset_csv(uploaded_file):
    """
    Mendeteksi dan mengimpor salah satu dari tiga dataset
    berdasarkan struktur kolom CSV.
    """

    _validate_upload(uploaded_file)

    text = _read_upload_text(uploaded_file)

    try:
        header_reader = csv.reader(
            io.StringIO(text)
        )
        header = next(
            header_reader,
            None,
        )

    except csv.Error as exc:
        raise ValueError(
            f"CSV tidak dapat dibaca: {exc}"
        ) from exc

    if not header:
        raise ValueError(
            "File CSV kosong atau tidak memiliki header."
        )

    columns = {
        str(name or "").strip().upper()
        for name in header
    }

    if WAREHOUSE_SALES_COLUMNS.issubset(columns):
        return import_warehouse_sales_csv(
            uploaded_file,
            text=text,
        )

    return import_retail_csv(
        uploaded_file,
        text=text,
    )