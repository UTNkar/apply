import unittest
from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Member


class TestMemberMethods(TestCase):

    def setUp(self):
        # Create a test member
        self.test_member = Member.objects.create(
            email="test@example.com",
            phone_number="123-456-7890",
            is_superuser=False,
            is_staff=False,
            name="Test User",
            ssn="199001011234",  # Valid format Swedish SSN
            registration_year="2020",
            status="member",
        )

    def test_find_user_by_ssn_valid_user_exists(self):
        """Test finding a user with a valid SSN that exists in the database"""
        found_user = Member.find_user_by_ssn("199001011234")
        self.assertIsNotNone(found_user)
        self.assertEqual(found_user.id, self.test_member.id)
        self.assertEqual(found_user.name, "Test User")

    def test_find_user_by_ssn_with_whitespace(self):
        """Test finding a user with a valid SSN that has whitespace"""
        found_user = Member.find_user_by_ssn("  199001011234  ")
        self.assertIsNotNone(found_user)
        self.assertEqual(found_user.id, self.test_member.id)

    def test_find_user_by_ssn_user_not_found(self):
        """Test finding a user with a valid SSN that doesn't exist in the database"""
        found_user = Member.find_user_by_ssn(
            "199901010000"
        )  # Valid format but doesn't exist
        self.assertIsNone(found_user)

    @patch("backend.models.Member.objects.filter")
    def test_find_user_by_ssn_database_error(self, mock_filter):
        """Test handling of database errors"""
        # Setup the mock to raise an exception
        mock_filter.side_effect = Exception("Database error")

        # Even with an exception, the function should return None
        found_user = Member.find_user_by_ssn("199001011234")
        self.assertIsNone(found_user)

        # Verify that filter was called with correct arguments
        mock_filter.assert_called_once_with(ssn="199001011234")

    def test_find_user_by_ssn_none_input(self):
        """Test finding a user with None input"""
        with self.assertRaises(
            AttributeError
        ):  # .strip() on None raises AttributeError
            Member.find_user_by_ssn(None)


if __name__ == "__main__":
    unittest.main()
