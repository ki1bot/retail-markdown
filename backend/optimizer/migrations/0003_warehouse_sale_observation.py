from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("optimizer", "0002_retail_observation_and_owner"),
    ]

    operations = [
        migrations.CreateModel(
            name="WarehouseSaleObservation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),

                ("year", models.PositiveSmallIntegerField()),

                ("month", models.PositiveSmallIntegerField()),

                (
                    "supplier",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=100,
                    ),
                ),

                (
                    "item_code",
                    models.CharField(max_length=40),
                ),

                (
                    "item_description",
                    models.CharField(max_length=120),
                ),

                (
                    "item_type",
                    models.CharField(max_length=40),
                ),

                (
                    "retail_sales",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=18,
                        null=True,
                    ),
                ),

                (
                    "retail_transfers",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=18,
                    ),
                ),

                (
                    "warehouse_sales",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=18,
                    ),
                ),
            ],

            options={
                "indexes": [
                    models.Index(
                        fields=["year", "month"],
                        name="whs_year_month_idx",
                    ),

                    models.Index(
                        fields=["item_type"],
                        name="whs_item_type_idx",
                    ),

                    models.Index(
                        fields=["supplier"],
                        name="whs_supplier_idx",
                    ),

                    models.Index(
                        fields=["item_code"],
                        name="whs_item_code_idx",
                    ),
                ],
            },
        ),
    ]