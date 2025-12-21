from rest_framework.serializers import ModelSerializer, ValidationError
from .models import Position, Role, Team, Member, Section, StudyProgram

class SectionSerializer(ModelSerializer):
    class Meta:
        model = Section
        fields = ['id', 'abbreviation', 'section_en', 'section_sv']
        read_only_fields = ['id']

class StudyProgramSerializer(ModelSerializer):
    section = SectionSerializer(read_only=True)
    
    class Meta:
        model = StudyProgram
        fields = ['id', 'name_en', 'name_sv', 'section']
        read_only_fields = ['id']

class StudyProgramSerializer(ModelSerializer):
    """StudyProgram without nested section for use in SectionWithProgramsSerializer"""
    class Meta:
        model = StudyProgram
        fields = ['id', 'name_en', 'name_sv', 'section']
        read_only_fields = ['id']

class SectionWithProgramsSerializer(ModelSerializer):
    """Section with nested study programs"""
    programs = StudyProgramSerializer(source='study_programs', many=True, read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'abbreviation', 'section_en', 'section_sv', 'programs']
        read_only_fields = ['id']

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
    
    class Meta:
        model = Member
        fields = ('name', 'phone_number', 'study_program', 'registration_year', 'status', 'ssn', 'email', 'password', 'is_active', 'is_staff', 'verified_email')
        extra_kwargs = {
            'password': {'write_only': True},
            # Debateable if we want to expose these fields
            'is_active': {'read_only': True},
            'is_staff': {'read_only': True},
            'verified_email': {'read_only': True},
        }

    def create(self, validated_data):
        print("Creating user")

        password = validated_data.pop('password', None)
        if password is None:
            raise ValueError('Password must be set')
        user = Member(**validated_data)
        user.set_password(password)
        user.save()

        # TODO: Email verification here
 
        return user

class TeamSerializer(ModelSerializer):
    class Meta:
        model = Team
        fields = [
            'id', 
            'name_en', 
            'name_sv', 
            'logo', 
            'desc_en', 
            'desc_sv'
            ]
        
        read_only_fields = ['id']

class RoleSerializer(ModelSerializer):
    team_details = TeamSerializer(source='team', read_only=True)

    class Meta:
        model = Role
        fields = [
            'id', 
            'team', 
            'team_details',  # Nested representation
            'role_type', 
            'archived', 
            'title_en', 
            'title_sv', 
            'description_en', 
            'description_sv', 
            'contact_email'
        ]

        read_only_fields = ['id']


class PositionSerializer(ModelSerializer):
    role_details = RoleSerializer(source='role', read_only=True)
    
    # Mandate history currently not included in the serializer
    # may not be needed as you wont need to see who has had a position in the past
    # only people who have had a position need to see their own history
    class Meta:
        model = Position
        fields = [
            'id', 
            'role', 
            'role_details',  # Nested representation
            'recruitment_start', 
            'recruitment_end',
            'appointed', 
            'term_from', 
            'term_end',
            'comment_eng', 
            'comment_sv'
        ]

        read_only_fields = ['id']


class CreatePositionSerializer(ModelSerializer):
    class Meta:
        model = Position
        fields = [
            'role', 
            'recruitment_start', 
            'recruitment_end',
            'appointed', 
            'term_from', 
            'term_end',
            'comment_eng', 
            'comment_sv'
        ]
