from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import TestCase


class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()

        self.verified_user = User.objects.create(
            email="verified@example.com",
            name="Verified User",
            phone_number="+4600000000",
            ssn="199001010001",
            verified_email=True,
            is_active=True,
        )
        self.verified_user.set_password("securepass123")
        self.verified_user.save()

        self.unverified_user = User.objects.create(
            email="unverified@example.com",
            name="Unverified User",
            phone_number="+4600000001",
            ssn="199001010002",
            verified_email=False,
            is_active=True,
        )
        self.unverified_user.set_password("securepass123")
        self.unverified_user.save()

    def test_password_reset_email_sent_for_verified_user(self):
        response = self.client.post(
            reverse("reset-password"),
            {"email": self.verified_user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, [self.verified_user.email])

    def test_password_reset_email_not_sent_for_unverified_user(self):
        response = self.client.post(
            reverse("reset-password"),
            {"email": self.unverified_user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)


class SignupTests(TestCase):
    """Tests for the signup endpoint and duplicate-account prevention."""

    def setUp(self):
        self.client = APIClient()
        self.signup_url = reverse("signup")

    def _fake_user_data(self, ssn="200001011234", unicore_id=42):
        return {
            "ssn": ssn,
            "firstname": "Kalle",
            "lastname": "Sprätt",
            "email": "kalle.spratt@kb.se",
            "phone_number": "0700000000",
            "unicore_id": unicore_id,
        }

    def _signup(self, ssn, email):
        return self.client.post(
            self.signup_url,
            {
                "ssn": ssn,
                "email": email,
                "password": "KB@Bappelsin1337",
                "name": "Kalle Sprätt",
                "phone_number": "0700000000",
            },
            format="json",
        )

    @patch("backend.serializers.unicoremember")
    def test_signup_stores_canonical_ssn_and_unicore_id(self, mock_unicore):
        mock_unicore.return_value.get_user_data.return_value = self._fake_user_data()

        response = self._signup("20000101-1234", "kalle.spratt@kb.se")

        self.assertEqual(response.status_code, 201)
        member = get_user_model().objects.get(email="kalle.spratt@kb.se")
        self.assertEqual(member.unicore_id, 42)
        # Stored SSN is normalized to Unicore's canonical form
        self.assertEqual(member.ssn, "200001011234")

    @patch("backend.serializers.unicoremember")
    def test_signup_rejects_duplicate_unicore_id_with_different_ssn_format(
        self, mock_unicore
    ):
        # The dash variant is a *different raw string*, so the field-level
        # unique check passes; only the unicore_id dedup can catch it.
        mock_unicore.return_value.get_user_data.side_effect = [
            self._fake_user_data(),
            self._fake_user_data(),
        ]

        first = self._signup("200001011234", "kalle.spratt@kb.se")
        self.assertEqual(first.status_code, 201)

        second = self._signup("20000101-1234", "other@example.com")
        self.assertEqual(second.status_code, 400)
        self.assertIn("ssn", second.data)

    @patch("backend.serializers.unicoremember")
    def test_signup_rejects_duplicate_unicore_id_same_ssn(self, mock_unicore):
        mock_unicore.return_value.get_user_data.side_effect = [
            self._fake_user_data(),
            self._fake_user_data(),
        ]

        first = self._signup("200001011234", "kalle.spratt@kb.se")
        self.assertEqual(first.status_code, 201)

        second = self._signup("200001011234", "other@example.com")
        self.assertEqual(second.status_code, 400)
        self.assertIn("ssn", second.data)

    @patch("backend.serializers.unicoremember")
    def test_signup_rejects_unregistered_ssn(self, mock_unicore):
        mock_unicore.return_value.get_user_data.return_value = None

        response = self._signup("200001011234", "kalle.spratt@kb.se")

        self.assertEqual(response.status_code, 400)
        self.assertIn("SSN", str(response.data))
