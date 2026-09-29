from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from .admin import (
    _application_viewable,
    _get_user_team_scopes,
    ApplicationAdmin,
)
from .models import Appointment, Application, Position, Role, Team


class ApplicationVisibilityTests(TestCase):
    """Users appointed to a presidium or group leader role may only see
    applications for positions in that team whose recruitment window ends on or
    after their appointment date. Board+ appointers (admin/fum/board) and
    superusers see all applications."""

    def setUp(self):
        self.today = date.today()
        self.team_a = Team.objects.create(name_en="Team A", name_sv="Grupp A")
        self.team_b = Team.objects.create(name_en="Team B", name_sv="Grupp B")

        self.board_role = Role.objects.create(
            role_type=Role.BOARD,
            title_en="Board",
            title_sv="Styrelse",
            description_en="Board role",
            description_sv="Styrelseroll",
            contact_email="board@example.com",
        )
        self.board_role.teams.add(self.team_a)
        self.presidium_role = Role.objects.create(
            role_type=Role.PRESIDIUM,
            title_en="Presidium",
            title_sv="Presidium",
            description_en="Presidium role",
            description_sv="Presidiumroll",
            contact_email="presidium@example.com",
        )
        self.presidium_role.teams.add(self.team_b)

        # Roles that sit below the appointer's own level. The scope model
        # never lets an appointer see their own level (no horizontal access).
        self.involved_a_role = Role.objects.create(
            role_type=Role.INVOLVED,
            title_en="Involved A",
            title_sv="Involved A",
            description_en="Involved role A",
            description_sv="Involved roll A",
            contact_email="involved-a@example.com",
        )
        self.involved_a_role.teams.add(self.team_a)
        self.involved_b_role = Role.objects.create(
            role_type=Role.INVOLVED,
            title_en="Involved B",
            title_sv="Involved B",
            description_en="Involved role B",
            description_sv="Involved roll B",
            contact_email="involved-b@example.com",
        )
        self.involved_b_role.teams.add(self.team_b)

        # Positions the appointer themselves holds (board in team A, presidium
        # in team B).
        self.board_position = Position.objects.create(
            role=self.board_role,
            recruitment_end=date(2020, 6, 1),
            term_from=self.today - timedelta(days=100),
            term_end=self.today + timedelta(days=365),
        )
        self.presidium_position = Position.objects.create(
            role=self.presidium_role,
            recruitment_end=date(2020, 6, 1),
            term_from=self.today - timedelta(days=100),
            term_end=self.today + timedelta(days=365),
        )

        # Positions the appointer manages. Team A is board-owned (no date
        # filter); team B has one position recruiting before the appointment and
        # one after it.
        self.involved_a_position = Position.objects.create(
            role=self.involved_a_role,
            recruitment_end=date(2020, 6, 1),
            term_from=self.today - timedelta(days=100),
            term_end=self.today + timedelta(days=365),
        )
        self.involved_b_position_old = Position.objects.create(
            role=self.involved_b_role,
            recruitment_end=date(2020, 6, 1),
            term_from=self.today - timedelta(days=100),
            term_end=self.today + timedelta(days=365),
        )
        self.involved_b_position_new = Position.objects.create(
            role=self.involved_b_role,
            recruitment_end=date(2021, 6, 1),
            term_from=self.today - timedelta(days=100),
            term_end=self.today + timedelta(days=365),
        )

        # The appointer is board in team A (appointed 2020) and presidium in team
        # B (appointed 2021). Both positions are currently active.
        User = get_user_model()
        self.user = User.objects.create(
            email="appointer@example.com",
            name="Appointer",
            phone_number="+4600000000",
            ssn="19900101-1111",
            is_active=True,
        )
        self.board_base = date(2020, 1, 1)
        self.presidium_base = date(2021, 1, 1)
        Appointment.objects.create(
            member=self.user,
            position=self.board_position,
            appointed_by=self.user,
            appointed_date=self.board_base,
            status=Appointment.APPOINTED,
        )
        Appointment.objects.create(
            member=self.user,
            position=self.presidium_position,
            appointed_by=self.user,
            appointed_date=self.presidium_base,
            status=Appointment.APPOINTED,
        )

        self.applicant_a = User.objects.create(
            email="appl-a@example.com",
            name="Applicant A",
            phone_number="+4600000001",
            ssn="19900101-2222",
        )
        self.applicant_b = User.objects.create(
            email="appl-b@example.com",
            name="Applicant B",
            phone_number="+4600000002",
            ssn="19900101-3333",
        )
        self.applicant_c = User.objects.create(
            email="appl-c@example.com",
            name="Applicant C",
            phone_number="+4600000003",
            ssn="19900101-4444",
        )

        # Application for the board-owned team A (board+ users see all of it).
        self.app_a = Application.objects.create(
            position=self.involved_a_position,
            member=self.applicant_a,
            status=Application.SUBMITTED,
            cover_letter="cover A",
            qualifications="qual A",
            gdpr=True,
        )
        # Applications in the presidium team B for positions recruiting
        # before/after the 2021 appointment.
        self.app_b_before = Application.objects.create(
            position=self.involved_b_position_old,
            member=self.applicant_b,
            status=Application.SUBMITTED,
            cover_letter="cover B before",
            qualifications="qual B before",
            gdpr=True,
        )
        self.app_b_after = Application.objects.create(
            position=self.involved_b_position_new,
            member=self.applicant_c,
            status=Application.SUBMITTED,
            cover_letter="cover B after",
            qualifications="qual B after",
            gdpr=True,
        )

        self.rf = RequestFactory()
        self.admin = ApplicationAdmin(model=Application, admin_site=None)

    def _request(self, user):
        request = self.rf.get("/admin/backend/application/")
        request.user = user
        return request

    def test_team_scopes(self):
        scopes = _get_user_team_scopes(self.user)
        self.assertEqual(
            scopes[self.team_a.pk]["max_level"], Role.role_type_to_level(Role.BOARD)
        )
        self.assertEqual(
            scopes[self.team_b.pk]["max_level"],
            Role.role_type_to_level(Role.PRESIDIUM),
        )
        self.assertEqual(scopes[self.team_b.pk]["baseline"], self.presidium_base)

    def test_board_team_application_is_always_visible(self):
        scopes = _get_user_team_scopes(self.user)
        self.assertTrue(_application_viewable(self.app_a, scopes))

    def test_presidium_team_before_recruitment_end_is_hidden(self):
        scopes = _get_user_team_scopes(self.user)
        self.assertFalse(_application_viewable(self.app_b_before, scopes))

    def test_presidium_team_from_recruitment_end_onward_is_visible(self):
        scopes = _get_user_team_scopes(self.user)
        self.assertTrue(_application_viewable(self.app_b_after, scopes))

    def test_has_view_permission(self):
        request = self._request(self.user)
        self.assertTrue(self.admin.has_view_permission(request, obj=self.app_a))
        self.assertFalse(self.admin.has_view_permission(request, obj=self.app_b_before))
        self.assertTrue(self.admin.has_view_permission(request, obj=self.app_b_after))

    def test_queryset_excludes_old_recruitment_application(self):
        qs = self.admin.get_queryset(self._request(self.user))
        pks = set(qs.values_list("pk", flat=True))
        self.assertIn(self.app_a.pk, pks)
        self.assertNotIn(self.app_b_before.pk, pks)
        self.assertIn(self.app_b_after.pk, pks)

    def test_superuser_can_view_everything(self):
        User = get_user_model()
        superuser = User.objects.create(
            email="super@example.com",
            name="Super",
            phone_number="+4600000009",
            ssn="19900101-9999",
            is_superuser=True,
            is_staff=True,
        )
        request = self._request(superuser)
        self.assertTrue(self.admin.has_view_permission(request, obj=self.app_b_before))
        self.assertEqual(self.admin.get_queryset(request).count(), 3)

    def test_pure_presidium_user(self):
        User = get_user_model()
        pres_only = User.objects.create(
            email="pres@example.com",
            name="Presidium only",
            phone_number="+4600000008",
            ssn="19900101-8888",
        )
        Appointment.objects.create(
            member=pres_only,
            position=self.presidium_position,
            appointed_by=self.user,
            appointed_date=self.presidium_base,
            status=Appointment.APPOINTED,
        )
        scopes = _get_user_team_scopes(pres_only)
        self.assertFalse(_application_viewable(self.app_b_before, scopes))
        self.assertTrue(_application_viewable(self.app_b_after, scopes))
        qs = self.admin.get_queryset(self._request(pres_only))
        pks = set(qs.values_list("pk", flat=True))
        self.assertNotIn(self.app_b_before.pk, pks)
        self.assertIn(self.app_b_after.pk, pks)
