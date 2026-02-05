from django.contrib.auth.models import BaseUserManager
from django.db.models import Count, F, Manager, Q
from django.utils import timezone


class MemberManager(BaseUserManager):
    """
    Custom manager for Member model.
    Required as we are using ssn as the username instead of a username.

    Methods
    -------
    create_user(ssn, email, password=None, **extra_fields)
        Creates and returns a user with ssn, email, password and other fields.
    create_superuser(ssn, email, password=None, **extra_fields)
        Creates and returns a superuser with ssn, email, password and other fields.
    """

    def create_user(self, ssn, email, password=None, **extra_fields):
        if not ssn:
            raise ValueError("The SSN field must be set")
        if not email:
            raise ValueError("The Email field must be set")

        user = self.model(
            ssn=ssn,
            email=self.normalize_email(email),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, ssn, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("verified_email", True)

        return self.create_user(ssn, email, password, **extra_fields)


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