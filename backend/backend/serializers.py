from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from .models import Application, Member, Position, Reference, Role


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

    class Meta:
        model = Member
        fields = ("ssn", "email", "password", "is_active", "is_staff", "verified_email")
        extra_kwargs = {
            "password": {"write_only": True},
            # Debateable if we want to expose these fields
            "is_active": {"read_only": True},
            "is_staff": {"read_only": True},
            "verified_email": {"read_only": True},
        }

    def create(self, validated_data):
        print("Creating user")

        password = validated_data.pop("password", None)
        if password is None:
            raise ValueError("Password must be set")
        user = Member(**validated_data)
        user.set_password(password)
        user.save()

        # Email verification here

        return user

class RoleDetailSerializer(ModelSerializer):
    team_name = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    team_logo = serializers.ImageField(source="team.logo", read_only=True)

    class Meta:
        model = Role
        fields = [
            "team_name",
            "team_logo",
            "title",
            "description",
            "contact_email",
        ]

    def get_team_name(self, obj):
        lang = self.context.get('request').query_params.get('lang', 'en')
        return obj.team.name_sv if lang == 'sv' else obj.team.name_en

    def get_title(self, obj):
        lang = self.context.get('request').query_params.get('lang', 'en')
        return obj.title_sv if lang == 'sv' else obj.title_en

    def get_description(self, obj):
        lang = self.context.get('request').query_params.get('lang', 'en')
        return obj.description_sv if lang == 'sv' else obj.description_en


class PositionSerializer(ModelSerializer):
    role = RoleDetailSerializer(read_only=True)
    comment = serializers.SerializerMethodField()
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
        ]

    def get_comment(self, obj):
        lang = self.context.get('request').query_params.get('lang', 'en')
        return obj.comment_sv if lang == 'sv' else obj.comment_eng


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


class ListApplicationSerializer(ModelSerializer):
    """Serializer for Application model with nested position details (read-only)"""

    position_details = PositionSerializer(source="position", read_only=True)
    phone_number = serializers.CharField(source="member.phone_number", read_only=True)
    email = serializers.CharField(source="member.email", read_only=True)
    study_program = serializers.CharField(source="member.study_program", read_only=True)

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
            "rejection_date",
        ]
        read_only_fields = ["id", "status"]


class ReferenceNestedSerializer(ModelSerializer):
    """Nested serializer for references in application creation"""

    class Meta:
        model = Reference
        fields = ["name", "phone_num", "email", "comment"]
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
            "phone_num": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_blank": True},
            "comment": {"required": False, "allow_blank": True},
        }

    def validate(self, data):
        """Validate that if any field is filled, name and (email OR phone) are required"""
        name = (data.get("name") or "").strip()
        phone_num = (data.get("phone_num") or "").strip()
        email = (data.get("email") or "").strip()
        comment = (data.get("comment") or "").strip()

        # Check if any field has data
        has_any_field = any([name, phone_num, email, comment])

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


class ApplicationSerializer(ModelSerializer):
    """Serializer for creating and updating applications with nested references"""

    references = ReferenceNestedSerializer(many=True, required=False)

    class Meta:
        model = Application
        fields = [
            "position",
            "cover_letter",
            "qualifications",
            "gdpr",
            "status",
            "references",
        ]

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
        if self.instance and self.instance.status == "submitted":
            raise serializers.ValidationError(
                "Cannot edit a submitted application"
            )

        # Check if GDPR is accepted only when the user has decided to submit the application
        status = data.get("status", self.instance.status if self.instance else "draft")
        if status == "submitted":
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
        allowed_statuses = ["draft", "submitted"]
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
