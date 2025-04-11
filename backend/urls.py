"""
URL configuration for apply project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
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

router.register('auth/login', LoginAPIView, basename='login')
router.register('auth/logout', LogoutAPIView, basename='logout')
router.register('auth/signup', SignupAPIView, basename='signup')
router.register('auth/verify-email', EmailVerificationAPIView, basename='verify-email')
router.register('auth/resend-verification-email', ResendVerificationEmailAPIView, basename='resend-verification-email')
router.register('auth/password-reset', InitiatePasswordResetViewAPIView, basename='password-reset')
router.register('auth/reset-password', PasswordResetAPIView, basename='reset-password')
router.register('auth/change-password', ChangePasswordAPIView, basename='change-password')
router.register('auth/change-email', ChangeEmailAPIView, basename='change-email')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
