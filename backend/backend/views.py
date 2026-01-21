from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import Application, Position, Member, Section, StudyProgram
from .send_email import send_password_reset_email, send_verification_email
from .permissions import CanCreatePosition
from .serializers import (
    ApplicationSerializer,
    CreatePositionSerializer,
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

    This view processes login requests, authenticating users by email and password.
    It verifies that users have confirmed their email and that their account is active
    before granting login access.

    DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING

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
            When user's email is not verified or account is inactive.

    """

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        member = Member.find_user_by_email(email)
        if member is None:
            return Response({"message": "Invalid credentials"}, status=401)

        user = authenticate(request, username=member.ssn, password=password)

        if user is not None:
            if user.is_active and user.verified_email:
                login(request, user)
                csrf_token = get_token(request)
                return Response(
                    {
                        "message": "Login successful",
                        "csrf_token": csrf_token,
                        "user": {"email": user.email},
                    }
                )

            elif not user.verified_email:
                return Response({"message": "Email not verified"}, status=403)

            elif not user.is_active:
                return Response({"message": "User is inactive"}, status=403)

        return Response({"message": "Invalid credentials"}, status=401)


class SignupAPIView(APIView):
    """
    SignupAPIView handles user registration through the API.
    This view processes signup requests, creating new users with the provided email and password.
    It also handles email verification in the serializer by generating a unique token and sending a verification email i.

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
            serializer.save()
            return Response(
                {
                    "message": "User created successfully",
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
        Responds with HTTP 400
            When provided data is invalid or user does not exist.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        try:
            user = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response(
                {"message": "An error occurred while sending the password reset email"},
                status=400,
            )

        send_password_reset_email(user)

        return Response({"message": "Password reset email sent"}, status=200)


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

        if check_password(old_password, user.password):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password changed successfully"}, status=200)

        return Response(
            {"message": "An error occurred while changing the password"}, status=400
        )


class EmailVerificationAPIView(APIView):
    """
    EmailVerificationAPIView handles email verification through the API.
    This view processes GET requests to verify user email addresses using a token and ID.

    DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING

    Methods
    -------
        get(request)
            Process email verification requests and return appropriate responses based on verification status.

    Returns
    -------
        Responds with HTTP 200
            When email verification is successful.
        Responds with HTTP 400
            When verification link is invalid or expired.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.GET.get("id")
        token = request.GET.get("token")

        try:
            user = get_user_model().objects.get(pk=user_id)
        except get_user_model().DoesNotExist:
            user = None

        if default_token_generator.check_token(user, token):
            login(request, user)

            return Response({"message": "Email verified successfully"}, status=200)

        return Response({"message": "Invalid verification link"}, status=400)


class ResendVerificationEmailAPIView(APIView):
    """
    ResendVerificationEmailAPIView handles requests to resend email verification links.
    This view processes requests to resend the verification email to the user.

    Methods
    -------
        post(request)
            Process resend verification email requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 200
            When verification email is resent successfully.
        Responds with HTTP 400
            When provided data is invalid or user does not exist.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        # Email or SSN or both?
        email = request.data.get("email")
        # ssn = request.data.get('ssn')

        try:
            user = get_user_model().objects.get(email=email)
            # user = get_user_model().objects.get(ssn=ssn, email=email)
        except get_user_model().DoesNotExist:
            return Response(
                {"message": "An error occurred while sending the password reset email"},
                status=400,
            )

        if user.verified_email:
            return Response({"message": "Email already verified"}, status=400)

        send_verification_email(user)

        return Response({"message": "Verification email resent"}, status=200)


class ChangeEmailAPIView(APIView):
    """
    ChangeEmailAPIView handles requests to change the user's email address.
    This view processes requests to change the user's email address.

    THIS CURRENTLY DOES NOT SEND A VERIFICATION EMAIL
    SHOULD PROBABLY SEND A VERIFICATION EMAIL

    Methods
    -------
        post(request)
            Process change email requests and return appropriate responses based on validation status.

    Returns
    -------
        Responds with HTTP 200
            When email is changed successfully.
        Responds with HTTP 400
            When provided data is invalid or user does not exist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get("new_email")
        user = request.user

        if user.verified_email:
            user.email = new_email
            user.verified_email = False
            user.save()
            return Response({"message": "Email changed successfully"}, status=200)

        return Response(
            {"message": "An error occurred while changing the email"}, status=400
        )


#### END OF AUTHENTICATION VIEWS ####


# TODO: Should be removed if we're considering django-admin for admin functionalities
class CreatePositionAPIView(APIView):
    """
    CreatePositionAPIView handles creating new positions.
    Only authenticated users with appropriate permissions can create positions.

    Methods
    -------
        post(request)
            Process position creation requests and return appropriate responses.

    Returns
    -------
        Responds with HTTP 201
            When position is created successfully.
        Responds with HTTP 400
            When provided data is invalid.
    """

    permission_classes = [IsAuthenticated, CanCreatePosition]

    def post(self, request):
        serializer = CreatePositionSerializer(data=request.data)
        if serializer.is_valid():
            position = serializer.save()
            return Response(
                {
                    "message": "Position created successfully",
                    "position": PositionSerializer(position).data,
                },
                status=201,
            )

        return Response(serializer.errors, status=400)


class ApplicationViewSet(ModelViewSet):
    """
    ViewSet for managing applications.

    - List: Get all applications (public)
    - Create: Create a new application for a position
    - Retrieve: Get a specific application (public)
    - Update: Update own application (only draft/submitted status)
    - Destroy: Delete own application (only if draft status)
    """

    def get_queryset(self):
        """Get all applications with optimized queries"""
        queryset = Application.objects.select_related(
            "member", "position", "position__role"
        )

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


class PositionViewSet(ReadOnlyModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer

    def list(self, request):
        """Return both open positions and user's positions"""

        my_positions = Position.objects.for_member(request.user).select_related(
            "role", "role__team"
        )
        open_positions = (
            Position.objects.open_positions()
            .exclude(id__in=my_positions)
            .select_related("role", "role__team")
        )

        return Response(
            {
                "open_positions": self.get_serializer(open_positions, many=True).data,
                "my_positions": self.get_serializer(my_positions, many=True).data,
            }
        )


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

        # Handle study_program update if 'program' is provided in request
        if "program" in request.data:
            program_id = request.data.pop("program")
            try:
                program = StudyProgram.objects.get(id=program_id)
                user.study_program = program
                user.save()
            except StudyProgram.DoesNotExist:
                return Response({"program": ["Invalid study program ID"]}, status=400)

        serializer = MemberSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Account updated successfully", "user": serializer.data},
                status=200,
            )

        return Response(serializer.errors, status=400)


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
        elif join_date == True:
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
