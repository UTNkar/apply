from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationViewSet,
    ChangePasswordAPIView,
    InitiatePasswordResetViewAPIView,
    LoginAPIView,
    LogoutAPIView,
    MyAccountAPIView,
    OpenPositionsAPIView,
    PasswordResetAPIView,
    PositionViewSet,
    SectionsAPIView,
    SignupAPIView,
    UnicoreDataAPIView,
)

router = DefaultRouter()

router.register("positions", PositionViewSet)
router.register("applications", ApplicationViewSet, basename="application")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/login", LoginAPIView.as_view(), name="login"),
    path("api/auth/logout", LogoutAPIView.as_view(), name="logout"),
    path("api/auth/signup", SignupAPIView.as_view(), name="signup"),
    path(
        "api/auth/reset-password",
        InitiatePasswordResetViewAPIView.as_view(),
        name="reset-password",
    ),
    path("api/auth/reset", PasswordResetAPIView.as_view(), name="reset"),
    path(
        "api/auth/change-password",
        ChangePasswordAPIView.as_view(),
        name="change-password",
    ),
    path("api/account/", MyAccountAPIView.as_view(), name="my-account"),
    path("api/sections/", SectionsAPIView.as_view(), name="sections"),
    path("api/open-positions/", OpenPositionsAPIView.as_view(), name="open-positions"),
    path("api/update-unicore/", UnicoreDataAPIView.as_view(), name="update-unicore"),
    path("api/membership/", UnicoreDataAPIView.as_view(), name="update-unicore"),
    path("api/applications/by-position/<int:position_id>/", ApplicationViewSet.as_view({"get": "by_position"}), name="application-by-position"),
]
