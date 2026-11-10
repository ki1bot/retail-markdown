from django.urls import path

from .views import (
    HealthView,
    HistoryView,
    ImportView,
    OptimizeView,
    SummaryView,
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
        "data/summary/",
        SummaryView.as_view(),
        name="data-summary",
    ),
    path(
        "data/import/",
        ImportView.as_view(),
        name="data-import",
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