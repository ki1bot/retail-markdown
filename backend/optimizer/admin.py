from django.contrib import admin

from .models import (
    RetailObservation,
    SimulationRun,
    WarehouseSaleObservation,
)

@admin.register(RetailObservation)
class RetailObservationAdmin(admin.ModelAdmin):
    list_display = (
        "source",
        "observed_on",
        "store_id",
        "product_id",
        "category",
        "units_sold",
        "discount",
    )
    list_filter = (
        "source",
        "category",
        "observed_on",
    )
    search_fields = (
        "store_id",
        "product_id",
        "category",
    )

@admin.register(WarehouseSaleObservation)
class WarehouseSaleObservationAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "month",
        "supplier",
        "item_code",
        "item_type",
        "retail_sales",
        "retail_transfers",
        "warehouse_sales",
    )
    list_filter = (
        "year",
        "month",
        "item_type",
    )
    search_fields = (
        "supplier",
        "item_code",
        "item_description",
    )

@admin.register(SimulationRun)
class SimulationRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "created_at",
    )
    readonly_fields = (
        "input_data",
        "result_data",
        "created_at",
    )