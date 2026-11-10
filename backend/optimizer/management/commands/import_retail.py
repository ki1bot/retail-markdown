from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from optimizer.importer import import_retail_csv


class Command(BaseCommand):
    help = "Mengimpor dataset CSV ritel ke PostgreSQL."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            type=Path,
        )

    def handle(self, *args, **options):
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

                result = import_retail_csv(
                    uploaded_file
                )
        except (OSError, ValueError) as exc:
            raise CommandError(
                str(exc)
            ) from exc

        self.stdout.write(
            self.style.SUCCESS(
                "Dataset berhasil diimpor."
            )
        )

        self.stdout.write(
            f"Sumber: {result['source']}"
        )

        self.stdout.write(
            f"Total baris: {result['total_rows']}"
        )

        self.stdout.write(
            f"Data Clothing: {result['imported_rows']}"
        )

        self.stdout.write(
            f"Kategori lain: {result['ignored_rows']}"
        )

        self.stdout.write(
            "Prakiraan negatif disesuaikan: "
            f"{result['corrected_forecasts']}"
        )