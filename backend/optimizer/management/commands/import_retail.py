from pathlib import Path

from django.core.files import File

from django.core.management.base import (
    BaseCommand,
    CommandError,
)
from optimizer.importer import import_dataset_csv

class Command(BaseCommand):

    help = (
        "Mengimpor salah satu dataset CSV "
        "yang didukung ke PostgreSQL."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            type=Path,
        )

    def handle(
        self,
        *args,
        **options,
    ):
        csv_path = options["csv_file"]

        if not csv_path.is_file():
            raise CommandError(
                f"File tidak ditemukan: {csv_path}"
            )

        try:
            with csv_path.open("rb") as stream:
                uploaded_file = File(
                    stream,
                    name=csv_path.name,
                )

                result = import_dataset_csv(
                    uploaded_file
                )
        except (
            OSError,
            ValueError,
        ) as exc:
            raise CommandError(
                str(exc)
            ) from exc

        self.stdout.write(
            self.style.SUCCESS(
                result["message"]
            )
        )

        self.stdout.write(
            f"Sumber: {result['source']}"
        )

        self.stdout.write(
            f"Total baris: {result['total_rows']}"
        )

        self.stdout.write(
            f"Berhasil diimpor: {result['imported_rows']}"
        )

        self.stdout.write(
            f"Baris diabaikan: {result['ignored_rows']}"
        )
        if result["source"] == "warehouse_sales":
            self.stdout.write(
                "Supplier kosong: "
                f"{result['missing_supplier']}"
            )
            self.stdout.write(
                "Retail Sales kosong: "
                f"{result['missing_retail_sales']}"
            )
        else:
            self.stdout.write(
                "Forecast negatif disesuaikan: "
                f"{result['corrected_forecasts']}"
            )