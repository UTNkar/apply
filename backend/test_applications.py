from django.test import TestCase
from .models import Member, Application, Position, Role, Team, MandateHistory

class ApplicationFilteringTests(TestCase):
    
    def setUp(self):
        """Set up test data for the application filtering tests"""
        # Create teams
        self.team1 = Team.objects.create(
            name_en="IT Committee",
            name_sv="IT-utskottet",
            desc_en="IT Committee description",
            desc_sv="IT-utskottet beskrivning"
        )
        
        self.team2 = Team.objects.create(
            name_en="PR Committee", 
            name_sv="PR-utskottet",
            desc_en="PR Committee description",
            desc_sv="PR-utskottet beskrivning"
        )
        
        # Create roles
        self.role1 = Role.objects.create(
            team=self.team1,
            role_type="involved",
            title_en="Developer",
            title_sv="Utvecklare",
            description_en="Developer role",
            description_sv="Utvecklarroll",
            contact_email="dev@example.com"
        )
        
        self.role2 = Role.objects.create(
            team=self.team2,
            role_type="involved",
            title_en="Designer",
            title_sv="Designer",
            description_en="Designer role",
            description_sv="Designroll",
            contact_email="design@example.com"
        )
        
        # Create mandate history
        self.mandate_history = MandateHistory.objects.create()
        
        # Create positions
        self.position1 = Position.objects.create(
            role=self.role1,
            recruitment_start="2025-01-01",
            recruitment_end="2025-02-01",
            appointed=1,
            term_from="2025-03-01",
            term_end="2026-03-01"
        )
        self.position1.mandate_history.add(self.mandate_history)
        
        self.position2 = Position.objects.create(
            role=self.role2,
            recruitment_start="2025-01-01",
            recruitment_end="2025-02-01",
            appointed=1,
            term_from="2025-03-01",
            term_end="2026-03-01"
        )
        self.position2.mandate_history.add(self.mandate_history)
        
        # Create members
        self.member1 = Member.objects.create(
            name="John Doe",
            email="john@example.com",
            phone_number="123456789",
            ssn="199001011234",
            is_superuser=False,
            is_staff=False,
            status="member"
        )
        
        self.member2 = Member.objects.create(
            name="Jane Smith",
            email="jane@example.com",
            phone_number="987654321",
            ssn="199201021234",
            is_superuser=False,
            is_staff=False,
            status="member"
        )
        
        # Create applications
        self.application1 = Application.objects.create(
            position=self.position1,
            member=self.member1,
            status="submitted",
            cover_letter="Cover letter for IT position",
            qualifications="IT qualifications",
            gdpr=True
        )
        
        self.application2 = Application.objects.create(
            position=self.position2,
            member=self.member2,
            status="submitted",
            cover_letter="Cover letter for PR position",
            qualifications="PR qualifications",
            gdpr=True
        )
        
    def test_filter_applications_by_team_returns_correct_members(self):
        """Test that filter_applications_by_team returns members who applied to positions in the specified team"""
        # Get members who applied for team1 positions
        applications = Application.filter_applications_by_team(self.team1.id)
        
        # Check that only member1 is returned
        self.assertEqual(applications.count(), 1)
        self.assertEqual(applications.first().member, self.member1)
    
    def test_filter_applications_by_team_returns_empty_for_nonexistent_team(self):
        """Test that filter_applications_by_team returns an empty queryset for a nonexistent team ID"""
        nonexistent_team_id = 999
        applications = Application.filter_applications_by_team(nonexistent_team_id)
        
        self.assertEqual(applications.count(), 0)

    def test_filter_applications_by_team_handles_members_with_multiple_applications(self):
        """Test that filter_applications_by_team correctly handles members with multiple applications"""
        # Create another position in team1
        position3 = Position.objects.create(
            role=self.role1,
            recruitment_start="2025-04-01",
            recruitment_end="2025-05-01", 
            appointed=1,
            term_from="2025-06-01",
            term_end="2026-06-01"
        )
        position3.mandate_history.add(self.mandate_history)
        
        # Make member2 apply for this position too
        Application.objects.create(
            position=position3,
            member=self.member2,
            status="submitted",
            cover_letter="Another application",
            qualifications="More qualifications",
            gdpr=True
        )
        
        # Now member2 has applied for positions in both teams
        application = Application.filter_applications_by_team(self.team1.id)
        
        # Should now include both members, but without duplicates
        self.assertEqual(application.count(), 2)
        self.assertEqual(self.member1, application.first().member)        
        self.assertEqual(self.member2, application.last().member)

