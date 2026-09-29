"""Tests for the appointer data-access scope (admin permission model).

The rules under test:

- Group leaders see/manage only involved roles in their own teams.
- Presidium sees/manages group leaders and involved roles in their own teams.
- Board sees/manages everything strictly below board, organisation-wide.
- Nobody sees roles at their own level (no horizontal access).
- FUM (election committee) only sees roles flagged fum_managed.
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from .admin import role_scope_q
from .models import Appointment, Member, Position, Role, Team


class AppointerScopeTests(TestCase):
    def setUp(self):
        self.today = timezone.now().date()

        self.team_a = Team.objects.create(name_en="Team A", name_sv="Team A")
        self.team_b = Team.objects.create(name_en="Team B", name_sv="Team B")

        self.leader_role = self._make_role("Leader", Role.GROUP_LEADER, self.team_a)
        self.presidium_role = self._make_role("Presidium", Role.PRESIDIUM, self.team_a)
        self.board_role = self._make_role("Board", Role.BOARD, self.team_a)
        self.involved_a = self._make_role("Involved A", Role.INVOLVED, self.team_a)
        self.involved_b = self._make_role("Involved B", Role.INVOLVED, self.team_b)
        self.fum_role = self._make_role("Election committee head", Role.FUM, self.team_a)
        self.auditor_role = self._make_role("Internal auditor", Role.ADMIN, self.team_a)

    def _make_role(self, title, role_type, team, fum_managed=False):
        role = Role.objects.create(
            title_en=title,
            title_sv=title,
            description_en=title,
            description_sv=title,
            contact_email=f"{title.lower().replace(' ', '.')}@example.com",
            role_type=role_type,
            fum_managed=fum_managed,
        )
        role.teams.add(team)
        return role

    def _member(self, name):
        return Member.objects.create(
            email=f"{name.lower()}@example.com",
            name=name,
            phone_number="0700000000",
            ssn=f"19900101{abs(hash(name)) % 10000:04d}",
        )

    def _appoint(self, member, role):
        position = Position.objects.create(
            role=role,
            recruitment_end=self.today,
            term_from=self.today - timedelta(days=1),
            term_end=self.today + timedelta(days=30),
        )
        Appointment.objects.create(
            member=member,
            position=position,
            status=Appointment.APPOINTED,
        )
        return position

    def _visible_roles(self, member):
        return set(
            Role.objects.filter(role_scope_q(member)).values_list("id", flat=True)
        )

    def test_non_appointer_sees_nothing(self):
        member = self._member("Nobody")
        self.assertEqual(self._visible_roles(member), set())

    def test_group_leader_only_sees_involved_in_own_team(self):
        leader = self._member("Leader")
        self._appoint(leader, self.leader_role)

        self.assertEqual(self._visible_roles(leader), {self.involved_a.id})

    def test_presidium_sees_group_leaders_and_involved_in_own_team(self):
        member = self._member("Presidium")
        self._appoint(member, self.presidium_role)

        self.assertEqual(
            self._visible_roles(member),
            {self.leader_role.id, self.involved_a.id},
        )

    def test_board_sees_everything_below_board_organisation_wide(self):
        member = self._member("Board")
        self._appoint(member, self.board_role)

        self.assertEqual(
            self._visible_roles(member),
            {
                self.presidium_role.id,
                self.leader_role.id,
                self.involved_a.id,
                self.involved_b.id,
            },
        )

    def test_board_cannot_see_other_board_members(self):
        member = self._member("Board")
        self._appoint(member, self.board_role)

        # The board role is at the member's own level -> no horizontal access.
        self.assertNotIn(self.board_role.id, self._visible_roles(member))

    def test_board_cannot_see_admin_level_roles(self):
        member = self._member("Board")
        self._appoint(member, self.board_role)

        self.assertNotIn(self.auditor_role.id, self._visible_roles(member))

    def test_board_cannot_see_fum_managed_roles(self):
        self.involved_a.fum_managed = True
        self.involved_a.save(update_fields=["fum_managed"])
        self.presidium_role.fum_managed = True
        self.presidium_role.save(update_fields=["fum_managed"])

        member = self._member("Board")
        self._appoint(member, self.board_role)

        visible = self._visible_roles(member)
        # FUM's roles are off-limits to the board, even below board level.
        self.assertNotIn(self.involved_a.id, visible)
        self.assertNotIn(self.presidium_role.id, visible)
        # Everything else strictly below board is still visible.
        self.assertIn(self.leader_role.id, visible)
        self.assertIn(self.involved_b.id, visible)

    def test_fum_only_sees_fum_managed_roles(self):
        self.fum_role.fum_managed = True
        self.fum_role.save(update_fields=["fum_managed"])
        self.auditor_role.fum_managed = True
        self.auditor_role.save(update_fields=["fum_managed"])

        member = self._member("Fum")
        self._appoint(member, self.fum_role)

        # FUM sees the flagged roles (across levels), but nothing else.
        self.assertEqual(
            self._visible_roles(member),
            {self.fum_role.id, self.auditor_role.id},
        )

    def test_superuser_sees_everything(self):
        member = self._member("Root")
        member.is_superuser = True
        member.save(update_fields=["is_superuser"])

        all_roles = set(Role.objects.values_list("id", flat=True))
        self.assertEqual(self._visible_roles(member), all_roles)

    def test_expired_appointment_grants_no_access(self):
        member = self._member("Expired")
        position = Position.objects.create(
            role=self.leader_role,
            recruitment_end=self.today,
            term_from=self.today - timedelta(days=60),
            term_end=self.today - timedelta(days=1),
        )
        Appointment.objects.create(
            member=member,
            position=position,
            status=Appointment.APPOINTED,
        )

        self.assertEqual(self._visible_roles(member), set())
