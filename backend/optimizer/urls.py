from django.urls import path

from .views import HealthView, HistoryView, OptimizeView


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("optimize/", OptimizeView.as_view(), name="optimize"),
    path("history/", HistoryView.as_view(), name="history"),
]