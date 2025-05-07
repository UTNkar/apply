
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PositionViewSet,

    # Authentication
    LoginAPIView,
    LogoutAPIView,  
    SignupAPIView, 
    EmailVerificationAPIView, 
    ResendVerificationEmailAPIView,
    InitiatePasswordResetViewAPIView, 
    PasswordResetAPIView,
    ChangePasswordAPIView,
    ChangeEmailAPIView
)

router = DefaultRouter()

router.register('positions', PositionViewSet)


urlpatterns = [
    path('api/', include(router.urls)),
    path('api/', include(router.urls)),
    path('api/auth/login', LoginAPIView.as_view(), name='login'),
    path('api/auth/logout', LogoutAPIView.as_view(), name='logout'),
    path('api/auth/signup', SignupAPIView.as_view(), name='signup'),
    path('api/auth/verify-email', EmailVerificationAPIView.as_view(), name='verify-email'),
    path('api/auth/resend-verification-email', ResendVerificationEmailAPIView.as_view(), name='resend-verification-email'),
    path('api/auth/reset-password', InitiatePasswordResetViewAPIView.as_view(), name='reset-password'),
    path('api/auth/reset', PasswordResetAPIView.as_view(), name='reset'),
    path('api/auth/change-password', ChangePasswordAPIView.as_view(), name='change-password'),
    path('api/auth/change-email', ChangeEmailAPIView.as_view(), name='change-email'),
]
