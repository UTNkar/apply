from django.core.mail import send_mail
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site

from django.contrib.auth.tokens import default_token_generator


# This needs rate limiting
def send_verification_email(user):
    """
    TEMPORARY FUNCTION
    This function sends an email verification link to the user.
    The link contains a token that the user can use to verify their email address.
    
    """

    token = default_token_generator.make_token(user)

    subject = 'Verify your email address'
    message = f"Sign in with the secure link: http://localhost:3000/auth/verify-email?id={user.id}&token={token}"

    send_mail(
        subject,
        message,
        "webmaster@localhost",
        [user.email],
    )

# This needs rate limiting
def send_password_reset_email(user):
    """
    TEMPORARY FUNCTION
    This function sends a password reset email to the user.
    The email contains a link to reset the user's password.
    
    """
    token = default_token_generator.make_token(user)

    subject = 'Reset your password'
    message = f"Sign in with the secure link: http://localhost:3000/auth/reset?id={user.id}&token={token}"

    send_mail(
        subject,
        message,
        "webmaster@localhost",
        [user.email],
    )