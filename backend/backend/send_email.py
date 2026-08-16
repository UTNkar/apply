import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone

VERIFICATION_CODE_LENGTH = 6
VERIFICATION_CODE_TTL_MINUTES = 15
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60


def generate_verification_code(length=VERIFICATION_CODE_LENGTH):
    characters = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(characters) for _ in range(length))


# This needs rate limiting
def send_verification_email(user, *, allow_rate_limit=True):
    """
    Sends an email verification code to the user.
    """

    now = timezone.now()
    if (
        allow_rate_limit
        and user.email_verification_sent_at
        and (now - user.email_verification_sent_at).total_seconds()
        < VERIFICATION_RESEND_COOLDOWN_SECONDS
    ):
        return False

    code = generate_verification_code()
    user.email_verification_code = make_password(code)
    user.email_verification_code_expires_at = now + timedelta(
        minutes=VERIFICATION_CODE_TTL_MINUTES
    )
    user.email_verification_attempts = 0
    user.email_verification_sent_at = now
    user.save(
        update_fields=[
            "email_verification_code",
            "email_verification_code_expires_at",
            "email_verification_attempts",
            "email_verification_sent_at",
        ]
    )

    subject = "Verify your email address"
    message = (
        f"Verify your email address for Apply using the verification code {code}\n\n"
        f"Or you can verify by visiting https://{settings._EXTERNAL_HOST}/verify-email?email={user.email}&code={code}"
    )

    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [user.email],
    )

    return True


# This needs rate limiting
def send_password_reset_email(user):
    """
    This function sends a password reset email to the user.
    The email contains a link to reset the user's password.
    """
    token = default_token_generator.make_token(user)

    subject = "Reset your password"
    message = f"""You have requested to reset your password for UTN Apply.
Follow this link to reset your password:
https://{settings._EXTERNAL_HOST}/reset-password?id={user.id}&token={token}

If you did not request a password reset, please ignore this email.
This link will expire in {VERIFICATION_CODE_TTL_MINUTES} minutes.
If you have any questions, please contact us at admin@utn.se"""
    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [user.email],
    )
