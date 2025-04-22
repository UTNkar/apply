
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PositionViewSet

router = DefaultRouter()

router.register('positions', PositionViewSet)


urlpatterns = [
    path('api/', include(router.urls)),
]
