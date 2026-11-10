from django.urls import path

from .views import (
    HealthView,
    HistoryView,
    ImportView,
    OptimizeView,
    SummaryView,
    csrf_view,
    login_view,
    logout_view,
    me_view,
)


urlpatterns = [
    path(
        "health/",
        HealthView.as_view(),
        name="health",
    ),
    path(
        "auth/csrf/",
        csrf_view,
        name="auth-csrf",
    ),
    path(
        "auth/me/",
        me_view,
        name="auth-me",
    ),
    path(
        "auth/login/",
        login_view,
        name="auth-login",
    ),
    path(
        "auth/logout/",
        logout_view,
        name="auth-logout",
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