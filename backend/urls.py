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

urlpatterns = [
    path('admin/', admin.site.urls),
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
