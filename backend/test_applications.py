from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from rest_framework.exceptions import NotFound
from django.contrib.auth.models import User

from .views import ApplicationViewSet
from .models import Team, Role, MandateHistory, Position, Member, Application


class ApplicationViewSetTests(TestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        # create an admin user (IsAdminUser permission)
        self.admin = User.objects.create_user(
            username="admin", password="pass", is_staff=True, is_superuser=True
        )

        # create one team + related objects + two application
        self.team = Team.objects.create(
            name_en="Digitaliseringsgruppen",
            name_sv="Digitaliseringsgruppen",
            desc_en="desc",
            desc_sv="beskrivning",
        )
        self.role = Role.objects.create(
            team=self.team,
            role_type="involved",
            title_en="Dev",
            title_sv="Utvecklare",
            description_en="-",
            description_sv="-",
            contact_email="dev@example.com",
        )
        self.mandate = MandateHistory.objects.create()
        self.position = Position.objects.create(
            role=self.role,
            recruitment_start="2025-01-01",
            recruitment_end="2025-02-01",
            appointed=1,
            term_from="2025-03-01",
            term_end="2026-03-01",
        )
        self.position.mandate_history.add(self.mandate)
        self.member1 = Member.objects.create(
            name="John Doe",
            email="john@example.com",
            phone_number="123",
            ssn="19900101",
            is_superuser=False,
            is_staff=False,
            status="member",
        )
        self.member2 = Member.objects.create(
            name="Billy Bob",
            email="billybob@example.com",
            phone_number="123",
            ssn="20000101",
            is_superuser=False,
            is_staff=False,
            status="member",
        )
        self.application1 = Application.objects.create(
            position=self.position,
            member=self.member1,
            status="submitted",
            cover_letter="hi",
            qualifications="none",
            gdpr=True,
        )
        self.application2 = Application.objects.create(
            position=self.position,
            member=self.member2,
            status="submitted",
            cover_letter="hi",
            qualifications="none",
            gdpr=True,
        )

    def test_list_returns_apps_for_valid_team(self):
        request = self.factory.get("/api/applications/")
        force_authenticate(request, user=self.admin)

        view = ApplicationViewSet.as_view({"get": "list"})
        response = view(request, team_name="Digitaliseringsgruppen")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # should be a list with one element
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)

        # payload should include the nested member
        item1 = response.data[0]
        item2 = response.data[1]
        self.assertIn("member", item1)
        self.assertEqual(item1["member"]["name"], "John Doe")
        self.assertEqual(item2["member"]["name"], "Billy Bob")

    def test_list_raises_404_for_invalid_team(self):
        request = self.factory.get("/api/applications/")
        force_authenticate(request, user=self.admin)

        view = ApplicationViewSet.as_view({"get": "list"})

        response = view(request, team_name="unknown")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Invalid team name 'unknown'", response.data.get("detail", ""))