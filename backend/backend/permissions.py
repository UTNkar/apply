from django.utils import timezone
from rest_framework.permissions import BasePermission

from .models import Role
from .serializers import CreatePositionSerializer

CAN_CREATE_POSITION_ROLES = ["admin", "fum", "board", "presidium", "group_leader"]


# TODO: Should be removed if we're considering django-admin for admin functionalities
class CanCreatePosition(BasePermission):
    """
    Custom permission to check if a user can create a position.
    This permission checks if the user currently has a high enough role
    to create a position of the requested role
    """

    def has_permission(self, request, view):
        if request.method in ("POST", "PUT"):
            serializer = CreatePositionSerializer(data=request.data)
            if not serializer.is_valid():
                return False

            request_role = Role.role_type_to_level(
                serializer.validated_data.get("role")
            )

            roles = Role.objects.filter(
                positions__mandatate_history__member=request.user,
                positions__term_from__lte=timezone.now(),
                positions__term_to__gte=timezone.now(),
                role_type=CAN_CREATE_POSITION_ROLES,
            ).distinct()

            if roles.exists():
                for role in roles:
                    if Role.role_type_to_level(role) > request_role:
                        return True

        return False
