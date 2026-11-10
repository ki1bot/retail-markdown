from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("optimizer", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="simulationrun",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="markdown_simulations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="RetailObservation",
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
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("sales", "Retail Sales"),
                            ("inventory", "Retail Inventory"),
                        ],
                        max_length=20,
                    ),
                ),
                ("observed_on", models.DateField()),
                ("store_id", models.CharField(max_length=40)),
                ("product_id", models.CharField(max_length=40)),
                ("category", models.CharField(max_length=40)),
                ("region", models.CharField(max_length=40)),
                ("inventory_level", models.PositiveIntegerField()),
                ("units_sold", models.PositiveIntegerField()),
                (
                    "units_ordered",
                    models.PositiveIntegerField(),
                ),
                (
                    "demand_value",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=14,
                    ),
                ),
                (
                    "price",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                    ),
                ),
                ("discount", models.PositiveSmallIntegerField()),
                ("seasonality", models.CharField(max_length=40)),
                ("promotion", models.BooleanField(default=False)),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["source", "observed_on"],
                        name="opt_obs_src_date_idx",
                    ),
                    models.Index(
                        fields=["source", "discount"],
                        name="opt_obs_src_disc_idx",
                    ),
                ],
            },
        ),
    ]