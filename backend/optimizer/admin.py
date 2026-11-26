from django.contrib import admin

from .models import SimulationRun

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