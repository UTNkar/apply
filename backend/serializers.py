from rest_framework import serializers
from .models import Position, Role, Team, Application, Member

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ['id', 'name', 'email', 'status'] # Add other relevant fields if needed
        read_only_fields = ['id', 'status'] # Assuming status is determined by logic, not direct input

class TeamSerializer(serializers.ModelSerializer):
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

class RoleSerializer(serializers.ModelSerializer):
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


class PositionSerializer(serializers.ModelSerializer):
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

class ApplicationSerializer(serializers.ModelSerializer):
    # Only include member details as requested
    member = MemberSerializer(read_only=True) 

    class Meta:
        model = Application
        # Only include the member field in the output
        fields = ['id', 'member'] 
        read_only_fields = ['id', 'member']
