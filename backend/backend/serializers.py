from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from .models import (
    Position,
    Role,
    Member,
    Section,
    StudyProgram,
    Application,
    Reference,
)
from .send_email import send_verification_email
from .utils.unicore import unicoremember


def get_language_from_request(request):
    """Get language from cookie defaulting to 'en'"""
    return request.COOKIES.get("language", "en")


class SectionSerializer(ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "abbreviation", "section_en", "section_sv"]
        read_only_fields = ["id"]


class StudyProgramSerializer(ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)

    class Meta:
        model = StudyProgram
        fields = ["id", "name_en", "name_sv", "degree", "sections"]
        read_only_fields = ["id"]


class SectionWithProgramsSerializer(ModelSerializer):
    """Section with nested study programs"""

    programs = StudyProgramSerializer(
        source="study_programs", many=True, read_only=True
    )

    class Meta:
        model = Section
        fields = ["id", "abbreviation", "section_en", "section_sv", "programs"]
        read_only_fields = ["id"]


class MemberSerializer(ModelSerializer):
    """
    Serializer for Member model.
    This serializer handles the creation of new members and includes
    functionality for email verification.

    Methods
    -------
    create(validated_data)
        Creates a new member instance, sets the password, and sends a verification email.
        Also invalidates any previous verification tokens for the user.
        Returns the created member instance.
    """

    study_program = StudyProgramSerializer(read_only=True)
    study_program_id = serializers.PrimaryKeyRelatedField(
        queryset=StudyProgram.objects.all(),
        source="study_program",
        write_only=True,
        required=False,
        allow_null=True,
    )
    section = SectionSerializer(read_only=True)
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source="section",
        write_only=True,
        required=False,
        allow_null=True,
    )
    # Set from Unicore on creation
    unicore_id = serializers.IntegerField(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["email"].read_only = True
            self.fields["ssn"].read_only = True

    class Meta:
        model = Member
        fields = (
            "name",
            "phone_number",
            "study_program",
            "study_program_id",
            "section",
            "section_id",
            "registration_year",
            "status",
            "ssn",
            "email",
            "password",
            "is_active",
            "is_staff",
            "verified_email",
            "unicore_id",
        )
        extra_kwargs = {
            "password": {"write_only": True},
            # Debateable if we want to expose these fields
            "is_active": {"read_only": True},
            "is_staff": {"read_only": True},
            "verified_email": {"read_only": True},
        }

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as err:
            raise serializers.ValidationError(err.messages)
        return value

    def validate(self, attrs):
        section = attrs.get("section")
        study_program = attrs.get("study_program")

        if (
            section
            and study_program
            and not study_program.sections.filter(id=section.id).exists()
        ):
            raise serializers.ValidationError(
                {"section": ["Section does not match selected program."]}
            )

        # On account updates, reject clearing the study program
        if self.instance and "study_program" in attrs and attrs["study_program"] is None:
            raise serializers.ValidationError(
                {"study_program_id": ["Study program cannot be empty."]}
            )

        # Only run these checks on account creation, not updates
        if not self.instance:
            # Check if SSN is registered in Unicore
            ssn = attrs.get("ssn")
            if ssn:
                unicore = unicoremember()
                user_data = unicore.get_user_data(ssn)
                if user_data is None:
                    raise serializers.ValidationError(
                        {
                            "ssn": [
                                "SSN is not registered in Unicore. Please register here: https://unicorestudent.com/UTN/sv/shop"
                            ]
                        }
                    )

                # Normalize to Unicore's canonical SSN and record its member id.
                attrs["ssn"] = user_data["ssn"].strip()
                attrs["unicore_id"] = user_data["unicore_id"]

                # Check if this Unicore member already has an account
                if Member.objects.filter(unicore_id=attrs["unicore_id"]).exists():
                    raise serializers.ValidationError(
                        {"ssn": ["An account with this SSN already exists."]}
                    )

            # Check if email is already registered
            email = attrs.get("email")
            if email:
                existing = Member.find_user_by_email(email)
                if existing is not None:
                    raise serializers.ValidationError(
                        {"email": ["Email is already registered"]}
                    )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if password is None:
            raise serializers.ValidationError({"password": ["Password must be set"]})
        user = Member(**validated_data)
        user.set_password(password)

        try:
            user.save()
        except IntegrityError:
            raise serializers.ValidationError(
                {"ssn": ["An account with this SSN already exists."]}
            )

        send_verification_email(user)

        return user


class RoleDetailSerializer(ModelSerializer):
    team_name = serializers.SerializerMethodField()
    team_names = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    team_logo = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "team_name",
            "team_names",
            "team_logo",
            "title",
            "description",
            "role_description_url",
            "contact_email",
        ]

    @staticmethod
    def _primary_team(obj):
        # A role can now belong to several teams; expose the first as the
        # representative one for backwards compatibility with the frontend.
        return obj.teams.first()

    def get_team_name(self, obj):
        team = self._primary_team(obj)
        if team is None:
            return None
        lang = get_language_from_request(self.context.get("request"))
        return team.name_sv if lang == "sv" else team.name_en

    def get_team_names(self, obj):
        lang = get_language_from_request(self.context.get("request"))
        field = "name_sv" if lang == "sv" else "name_en"
        return list(obj.teams.values_list(field, flat=True))

    def get_team_logo(self, obj):
        team = self._primary_team(obj)
        if team is None or not team.logo:
            return None
        # Return the relative path (e.g. "/media/team_logos/dg.png").
        # The frontend prepends the correct backend base URL depending on
        # the environment (Docker, production, local dev, etc.).
        return team.logo.url

    def get_title(self, obj):
        lang = get_language_from_request(self.context.get("request"))
        return obj.title_sv if lang == "sv" else obj.title_en

    def get_description(self, obj):
        lang = get_language_from_request(self.context.get("request"))
        return obj.description_sv if lang == "sv" else obj.description_en


class PositionSerializer(ModelSerializer):
    role = RoleDetailSerializer(read_only=True)
    comment = serializers.SerializerMethodField()
    user_app_status = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = [
            "id",
            "role",
            "recruitment_start",
            "recruitment_end",
            "term_from",
            "term_end",
            "comment",
            "user_app_status",
        ]

    def get_comment(self, obj):
        lang = get_language_from_request(self.context.get("request"))
        return obj.comment_sv if lang == "sv" else obj.comment_eng

    def get_user_app_status(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return ""

        application = obj.applications.filter(member=request.user).first()
        status = ""
        if application:
            status = (
                _("In draft")
                if application.status == Application.DRAFT
                else _("Already applied")
            )
        return status


# TODO: Should be removed if we're considering django-admin for admin functionalities
class CreatePositionSerializer(ModelSerializer):
    class Meta:
        model = Position
        fields = [
            "role",
            "recruitment_start",
            "recruitment_end",
            "appointed",
            "term_from",
            "term_end",
            "comment_eng",
            "comment_sv",
        ]


class ReferenceNestedSerializer(ModelSerializer):
    """Nested serializer for references in application creation"""

    class Meta:
        model = Reference
        fields = ["name", "title", "phone_num", "email", "comment"]
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
            "title": {"required": False, "allow_blank": True},
            "phone_num": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_blank": True},
            "comment": {"required": False, "allow_blank": True},
        }

    def validate(self, data):
        """Validate that if any field is filled, name and (email OR phone) are required"""
        name = (data.get("name") or "").strip()
        title = (data.get("title") or "").strip()
        phone_num = (data.get("phone_num") or "").strip()
        email = (data.get("email") or "").strip()
        comment = (data.get("comment") or "").strip()

        # Check if any field has data
        has_any_field = any([name, title, phone_num, email, comment])

        if has_any_field:
            # name is required
            if not name:
                raise serializers.ValidationError(
                    {"name": "Name is required when providing reference information"}
                )

            # At least email OR phone is required
            if not email and not phone_num:
                raise serializers.ValidationError(
                    "Either email or phone number is required for a reference"
                )

        return data


class ListApplicationSerializer(ModelSerializer):
    """Serializer for Application model with nested position details (read-only)"""

    position_details = PositionSerializer(source="position", read_only=True)
    phone_number = serializers.CharField(source="member.phone_number", read_only=True)
    email = serializers.CharField(source="member.email", read_only=True)
    study_program = serializers.CharField(source="member.study_program", read_only=True)
    references = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "position_details",
            "email",
            "phone_number",
            "study_program",
            "status",
            "cover_letter",
            "qualifications",
            "gdpr",
            "decision_date",
            "references",
        ]
        read_only_fields = ["id", "status"]

    def get_references(self, obj):
        """Get references for the application"""
        references = Reference.objects.filter(application=obj)
        return ReferenceNestedSerializer(references, many=True).data


class ApplicationSerializer(ModelSerializer):
    """Serializer for creating and updating applications with nested references"""

    references = ReferenceNestedSerializer(many=True, required=False)

    class Meta:
        model = Application
        fields = [
            "id",
            "position",
            "cover_letter",
            "qualifications",
            "gdpr",
            "status",
            "references",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        """Validate application data"""
        # check if user already has an application for this position
        if not self.instance:
            user = self.context["request"].user
            position = data.get("position")

            if Application.objects.filter(member=user, position=position).exists():
                raise serializers.ValidationError(
                    "You have already applied for this position"
                )

        # prevent editing submitted applications
        if self.instance and self.instance.status == Application.SUBMITTED:
            raise serializers.ValidationError("Cannot edit a submitted application")

        # Check if GDPR is accepted
        gdpr_value = data.get("gdpr", self.instance.gdpr if self.instance else False)
        if not gdpr_value:
            raise serializers.ValidationError(
                {"gdpr": "You must accept the GDPR policy to submit an application"}
            )

        # Limit references to 3 for now
        references = data.get("references", [])
        if references and len(references) > 3:
            raise serializers.ValidationError(
                {"references": "Maximum 3 references allowed"}
            )

        return data

    def validate_status(self, value):
        """Validate status - only draft and submitted allowed"""
        allowed_statuses = [Application.DRAFT, Application.SUBMITTED]
        if value not in allowed_statuses:
            raise serializers.ValidationError(
                f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"
            )
        return value

    def create(self, validated_data):
        """Create application with current user as member and nested references"""
        references_data = validated_data.pop("references", [])
        validated_data["member"] = self.context["request"].user
        application = super().create(validated_data)

        references_to_create = [
            Reference(application=application, **ref_data)
            for ref_data in references_data
            if ref_data.get("name")
        ]
        if references_to_create:
            Reference.objects.bulk_create(references_to_create)

        return application

    def update(self, instance, validated_data):
        """Update application and replace references"""
        references_data = validated_data.pop("references", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if references_data is not None:
            Reference.objects.filter(application=instance).delete()
            references_to_create = [
                Reference(application=instance, **ref_data)
                for ref_data in references_data
                if ref_data.get("name")
            ]
            if references_to_create:
                Reference.objects.bulk_create(references_to_create)

        return instance
