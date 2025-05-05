from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAdminUser
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from .models import Position, Application
from .serializers import PositionSerializer, ApplicationSerializer

# Create your views here.

class PositionViewSet(ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer

class ApplicationViewSet(ModelViewSet):
    serializer_class = ApplicationSerializer 

    teams = {
        "Cafégruppen",
        "Digitaliseringsgruppen",
        "Eventgruppen",
        "Forsränningen",
        "Förvaltningen",
        "Hustomtar",
        "Internationaliseringsgruppen",
        "Internrevisorer",
        "Kårhusgruppen",
        "Ledningsgruppen",
        "Kårtidningen Techna",
        "Klubbverket",
        "Marknadsföringsgruppen",
        "Master & Exchange Reception",
        "Matteproppen",
        "Miljögruppen",
        "Naturvetarbalen",
        "Polhacks",
        "Rebusrallyt",
        "SFS",
        "Studentrepresentanter",
        "Styrelsen",
        "Talmanspresidiet",
        "Techna",
        "Teknolog-, datavetar- och basmottagningen",
        "Uppsala universitets förenade studentkårer",
        "Utnarm",
        "Valberedningen",
    }
    permission_classes = [IsAdminUser]
    def get_queryset(self):
        team_name = self.kwargs.get('team_name')
        if team_name not in self.teams:
            raise NotFound(f"Invalid team name '{team_name}'")     
        return Application.filter_applications_by_team(team_name)

    def list(self, request, *args, **kwargs): #should prob change so the serializer that is used is the one for the member since that is what we want back
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)