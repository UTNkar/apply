from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.middleware.csrf import get_token
from django.utils import timezone
from .managers import MemberManager
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import Application, Position, Member, Section, StudyProgram
from .send_email import send_password_reset_email
from .serializers import (
    ApplicationSerializer,
    ListApplicationSerializer,
    MemberSerializer,
    PositionSerializer,
    SectionWithProgramsSerializer,
)
from .utils.unicore import unicoremember

# Create your views here.


#### AUTHENTICATION VIEWS ####


class LoginAPIView(APIView):
    """
    LoginAPIView handles user authentication through the API.

    This view processes login requests, authenticating users by email or SSN
    plus password. It checks that the account is active before granting access.

    Methods
    -------
        post(request)
            Process login requests and return appropriate responses based on authentication status.

    Returns
    -------
        Responds with HTTP 200
            When login is successful, includes CSRF token and user info.
        Responds with HTTP 401
            When provided credentials are invalid.
        Responds with HTTP 403
            When the user's account is inactive.

    """

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip()
        password = request.data.get("password")

        if not identifier:
            return Response({"message": "Invalid credentials"}, status=401)

        # The single field accepts either the member's email or their SSN.
        member = Member.find_user_by_email(identifier)
        if member is None:
            # Stored SSNs are canonical (no dashes/spaces), so normalize the
            # input before matching.
            normalized_ssn = identifier.replace("-", "").replace(" ", "")
            member = Member.objects.filter(ssn=normalized_ssn).first()

            if member is None:
                return Response({"message": "Invalid credentials"}, status=401)

        user = authenticate(request, username=member.ssn, password=password)

        if user is not None:
            if user.is_active:
                login(request, user)
                csrf_token = get_token(request)
                return Response(
                    {
                        "message": "Login successful",
                        "csrf_token": csrf_token,
                        "user": {"email": user.email},
                    }
                )

            return Response({"message": "User is inactive"}, status=403)

        return Response({"message": "Invalid credentials"}, status=401)


class SignupAPIView(APIView):
    """
    SignupAPIView handles user registration through the API.
    This view processes signup requests. The email, phone number and
    verification status are sourced from Unicore via the serializer.

    Methods
    -------
        post(request)
            Process signup requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 201
            When user is created successfully.
        Responds with HTTP 400
            When provided data is invalid or user already exists."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MemberSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "message": "User created successfully",
                    # The user's email is sourced from Unicore, so surface it
                    # so they know what to log in with.
                    "email": user.email,
                },
                status=201,
            )

        return Response(serializer.errors, status=400)


class LogoutAPIView(APIView):
    """
    LogoutAPIView handles user logout through the API.
    This view processes logout requests, logging out the authenticated user.

    Methods
    -------
        post(request)
            Process logout requests and return appropriate responses based on logout status.

    Returns
    -------
        Responds with HTTP 200
            When logout is successful.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"}, status=200)


class InitiatePasswordResetViewAPIView(APIView):
    """
    InitiatePasswordAPIView handles password reset requests through the API.
    This view processes password reset requests, generating a unique token and sending a reset email to the user.

    Methods
    -------
        post(request)
            Process password reset requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 200
            When password reset email is sent successfully.
        Responds with HTTP 200
            When provided data is invalid or user does not exist.
    """

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        try:
            user = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            # We should return the same message and status so not to leak information about wether an account exists or not
            return Response(
                {
                    "message": "If an account with that email exists, a password reset email has been sent"
                },
                status=200,
            )

        send_password_reset_email(user)

        return Response(
            {
                "message": "If an account with that email exists, a password reset email has been sent"
            },
            status=200,
        )


class PasswordResetAPIView(APIView):
    """
    PasswordResetAPIView handles password reset through the API.
    This view processes password reset requests, allowing users to set a new password using a token, ID and new password.

    DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING

    Methods
    -------
        post(request)
            Process password reset requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 200
            When password is reset successfully.
        Responds with HTTP 400
            When provided data is invalid or user does not exist.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get("id")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not new_password:
            return Response({"message": "New password is required"}, status=400)

        try:
            validate_password(new_password)
        except ValidationError as err:
            return Response(
                {"message": " ".join(err.messages)},
                status=400,
            )

        try:
            user = get_user_model().objects.get(pk=user_id)
        except get_user_model().DoesNotExist:
            user = None

        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password reset successfully"}, status=200)

        return Response(
            {"message": "An error occurred while resetting the password"}, status=400
        )


class ChangePasswordAPIView(APIView):
    """
    ChangePasswordAPIView handles password change requests through the API.
    This view processes password change requests, allowing authenticated users to change their passwords.

    Methods
    -------
        post(request)
            Process password change requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 200
            When password is changed successfully.
        Responds with HTTP 400
            When provided data is invalid or user does not exist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not new_password:
            return Response({"message": "New password is required"}, status=400)

        try:
            validate_password(new_password, user=user)
        except ValidationError as err:
            return Response(
                {"message": " ".join(err.messages)},
                status=400,
            )
        
        if old_password == new_password:
            return Response(
                {"message": "New password cannot be the same as current password"},
                status=400,
            )

        if check_password(old_password, user.password):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password changed successfully"}, status=200)
        else:
            return Response({"message": "Current password is incorrect"}, status=400)


#### END OF AUTHENTICATION VIEWS ####


class ApplicationViewSet(ModelViewSet):
    """
    ViewSet for managing applications.

    - List: Get all applications for the current user
    - Create: Create a new application for a position
    - Retrieve: Get a specific application
    - Update: Update own application (only draft/submitted status)
    - Destroy: Delete own application (only if draft status)
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get applications for the current user with optimized queries"""
        queryset = Application.objects.select_related(
            "member", "position", "position__role"
        ).filter(member=self.request.user)

        # Filter by position if position_id is provided
        position_id = self.request.query_params.get("position_id", None)
        if position_id:
            queryset = queryset.filter(position_id=position_id)

        return queryset.order_by("-id")

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ["create", "update", "partial_update"]:
            return ApplicationSerializer
        return ListApplicationSerializer

    def perform_update(self, serializer):
        """Prevent updating finalized applications"""
        instance = self.get_object()

        # Only allow updates to draft applications
        if instance.status != Application.DRAFT:
            raise PermissionDenied(
                f"Cannot update application with status: {instance.status}"
            )

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Only allow deletion of draft applications"""
        instance = self.get_object()

        if instance.status != Application.DRAFT:
            raise PermissionDenied("You can only delete draft applications")

        instance.delete()
        return Response(
            {"message": "Application deleted successfully"}, status=status.HTTP_200_OK
        )

    def by_position(self, request, position_id=None):
        """Get the application for the logged-in user for a given position"""
        try:
            application = Application.objects.select_related(
                "member", "position", "position__role"
            ).get(position_id=position_id, member=request.user)
            serializer = ListApplicationSerializer(
                application, context={"request": request}
            )
            return Response(serializer.data)
        except Application.DoesNotExist:
            return Response(
                {"detail": "Application not found for this position."},
                status=status.HTTP_404_NOT_FOUND,
            )


class PositionViewSet(ReadOnlyModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer

    def list(self, request):
        """Return both open positions and user's positions"""
        if request.user.is_authenticated:
            my_positions = (
                Position.objects.for_member(request.user)
                .select_related("role")
                .prefetch_related("role__teams")
            )
        else:
            my_positions = Position.objects.none()

        open_positions = (
            Position.objects.open_positions()
            .select_related("role")
            .prefetch_related("role__teams")
        )

        return Response(
            {
                "open_positions": self.get_serializer(open_positions, many=True).data,
                "my_positions": self.get_serializer(my_positions, many=True).data,
            }
        )


class OpenPositionsAPIView(APIView):
    """
    OpenPositionsAPIView handles retrieving all open positions.

    Methods
    -------
        get(request)
            Retrieve all open positions.

    Returns
    -------
        Responds with HTTP 200
            When open positions are retrieved successfully.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        open_positions = (
            Position.objects.open_positions()
            .select_related("role")
            .prefetch_related("role__teams")
        )
        serializer = PositionSerializer(
            open_positions, many=True, context={"request": request}
        )
        return Response(serializer.data, status=200)


class MyAccountAPIView(APIView):
    """
    MyAccount handles retrieving the authenticated user's account information.

    Methods
    -------
        get(request)
            Retrieve the authenticated user's account information.

        post(request)
            Update the authenticated user's account information.

    Returns
    -------
        Responds with HTTP 200
            When account information is retrieved successfully.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MemberSerializer(request.user)
        return Response(serializer.data, status=200)

    def post(self, request):
        user = request.user

        serializer = MemberSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Account updated successfully", "user": serializer.data},
                status=200,
            )

        return Response(serializer.errors, status=400)

    def delete(self, request):
        user = request.user
        password = request.data.get("password")

        if not password:
            return Response({"message": "Password is required"}, status=400)

        if not check_password(password, user.password):
            return Response({"message": "Current password is incorrect"}, status=400)

        user.delete()
        logout(request)

        return Response({"message": "Account deleted successfully"}, status=200)


class UnicoreDataAPIView(APIView):
    def get(self, request):
        """
        Get membership status of the logged in user from unicore
        """
        req_user = request.user
        unicore = unicoremember()
        try:
            join_date = unicore.get_member_since(req_user.ssn)
        except Exception as e:
            return Response({"message": str(e)}, status=500)

        if join_date is False:
            join_date = "Not a member"
        elif join_date is True:
            join_date = "Member"
        else:
            # Format date to YYYY-MM-DD
            join_date = join_date.split("T")[0]
        return Response(join_date, status=200)

    def post(self, request):
        """
        Updates the logged in user's data from unicore
        """
        req_user = request.user
        user = Member.objects.get(ssn=req_user.ssn)
        unicore = unicoremember()
        data = unicore.get_user_data(user.ssn)

        if data is not None:
            user.name = "{} {}".format(
                data["firstname"].strip(), data["lastname"].strip()
            )
            user.save()

        serializer = MemberSerializer(user)
        return Response(serializer.data, status=200)


class SectionsAPIView(APIView):
    """
    SectionsAPIView returns all sections with their associated study programs.

    Methods
    -------
        get(request)
            Retrieve all sections with nested study programs.

    Returns
    -------
        Responds with HTTP 200
            When sections are retrieved successfully.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        sections = Section.objects.prefetch_related("study_programs").all()
        serializer = SectionWithProgramsSerializer(sections, many=True)
        return Response(serializer.data, status=200)
