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
