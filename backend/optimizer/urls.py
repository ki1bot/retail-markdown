from django.urls import path

from .views import (
    DashboardSummaryView,
    DatasetStatusView,
    DatasetUploadView,
    ElasticityView,
    HealthView,
    HistoryView,
    OptimizeView,
    csrf_view,
)

urlpatterns = [
    path(
        "health/",
        HealthView.as_view(),
        name="health",
    ),

    path(
        "csrf/",
        csrf_view,
        name="csrf",
    ),

    path(
        "data/status/",
        DatasetStatusView.as_view(),
        name="data-status",
    ),

    path(
        "data/summary/",
        DashboardSummaryView.as_view(),
        name="data-summary",
    ),

    path(
        "data/elasticity/",
        ElasticityView.as_view(),
        name="data-elasticity",
    ),

    path(
        "data/upload/",
        DatasetUploadView.as_view(),
        name="data-upload",
    ),

    path(
        "optimize/",
        OptimizeView.as_view(),
        name="optimize",
    ),

    path(
        "history/",
        HistoryView.as_view(),
        name="history",
    ),
]