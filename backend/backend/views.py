from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from .models import Position
from .serializers import PositionSerializer

# Create your views here.

class PositionViewSet(ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer