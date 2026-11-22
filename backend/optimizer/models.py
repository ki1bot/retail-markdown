from django.conf import settings
from django.db import models

class SimulationRun(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="markdown_simulations",
    )
    input_data = models.JSONField()
    result_data = models.JSONField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Simulasi #{self.pk}"

class RetailObservation(models.Model):
    SOURCE_CHOICES = [
        ("sales", "Retail Sales"),
        ("inventory", "Retail Inventory"),
    ]

    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
    )
    observed_on = models.DateField()

    store_id = models.CharField(
        max_length=40
    )

    product_id = models.CharField(
        max_length=40
    )

    category = models.CharField(
        max_length=40
    )

    region = models.CharField(
        max_length=40
    )

    inventory_level = models.PositiveIntegerField()
    units_sold = models.PositiveIntegerField()
    units_ordered = models.PositiveIntegerField()
    demand_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    discount = models.PositiveSmallIntegerField()

    seasonality = models.CharField(
        max_length=40
    )

    promotion = models.BooleanField(
        default=False
    )

    weather_condition = models.CharField(
        max_length=40,
        blank=True,
        default="",
    )

    competitor_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    epidemic = models.BooleanField(
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "source",
                    "observed_on",
                ],
                name="opt_obs_src_date_idx",
            ),
            models.Index(
                fields=[
                    "source",
                    "discount",
                ],
                name="opt_obs_src_disc_idx",
            ),
            models.Index(
                fields=[
                    "source",
                    "product_id",
                    "observed_on",
                ],
                name="opt_obs_product_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.source} - "
            f"{self.product_id} - "
            f"{self.observed_on}"
        )

class WarehouseSaleObservation(models.Model):
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    supplier = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    item_code = models.CharField(
        max_length=40
    )

    item_description = models.CharField(
        max_length=120
    )

    item_type = models.CharField(
        max_length=40
    )

    retail_sales = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )
    retail_transfers = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )
    warehouse_sales = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "year",
                    "month",
                ],
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
        ]

    def __str__(self):
        return (
            f"{self.year}-{self.month:02d} "
            f"· {self.item_code}"
        )