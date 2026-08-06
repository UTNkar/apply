from django.contrib.auth.models import BaseUserManager
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count, F, Manager, Q
from django.utils import timezone

from .utils.unicore import unicoremember


class MemberManager(BaseUserManager):
    """
    Custom manager for Member model.
    Required as we are using ssn as the username instead of a username.

    Methods
    -------
    create_user(email, password=None, **extra_fields)
        Creates and returns a user with an email, password and other fields.
    """

    def create_user(
        self,
        email,
        ssn,
        password,
        phone_number,
        study_program=None,
        is_staff=False,
        is_superuser=False,
        verified_email=False,
        **extra_fields,
    ):
        if not email:
            raise ValueError("The Email field must be set")
        if not password:
            raise ValueError("Password must be set")
        if not ssn:
            raise ValueError("The SSN field must be set")

        try:
            validate_password(password)
        except ValidationError as err:
            raise ValueError(" ".join(err.messages))

        if is_superuser:
            # Bypass unicore checks
            name = "Admin"
            unicore_id = None
        else: 
            unicore = unicoremember()
            data = unicore.get_user_data(ssn)
            if data is None:
                raise ValueError(
                    "You don't appear to be registered as a member in Unicore. Please go to https://utn.se/en/bli-medlem to become a member before signing up."
                )
            name = "{} {}".format(data["firstname"].strip(), data["lastname"].strip())
            ssn = data["ssn"].strip()
            unicore_id = data["unicore_id"]

        user = self.model(
            email=email.lower().strip(),
            verified_email=verified_email,
            is_staff=is_staff,
            is_superuser=is_superuser,
            name=name,
            phone_number=phone_number.strip(),
            ssn=ssn,
            study_program=study_program,
            unicore_id=unicore_id,
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, ssn, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("verified_email", True)
        extra_fields.setdefault("phone_number", "133713371337")

        return self.create_user(
            email=email,
            ssn=ssn,
            password=password,
            **extra_fields,
        )


class PositionManager(Manager):
    """Custom manager for Position model"""

    def open_positions(self):
        """Get positions currently in recruitment period with unfilled slots"""
        now = timezone.now()
        return (
            self.get_queryset()
            .filter(
                recruitment_start__lte=now,
                recruitment_end__gte=now,
            )
            .annotate(
                appointed_count=Count(
                    "applications", filter=Q(applications__status="appointed")
                )
            )
            .filter(Q(appointed_count__lt=F("appointed")))
        )

    def for_member(self, member):
        """Get positions a member has applied to"""
        return self.get_queryset().filter(appointments__member=member).distinct()
