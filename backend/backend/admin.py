from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Member

# Register your models here.
class MemberAdmin(UserAdmin):
    """
    Custom admin interface for the Member model.
    Required as we are using ssn as the username instead of a username
    and do not want a username field
    """

    model = Member
    list_display = ('ssn', 'email', 'name', 'is_staff', 'is_active', 'verified_email')
    search_fields = ('ssn','email', 'name')
    ordering = ('ssn','email',)
    fieldsets = (
        (None, {'fields': ('ssn','email', 'password')}),
        ('Personal info', {'fields': ('name',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'verified_email')}),
    )
    add_fieldsets = (
        (None, {'fields': ('ssn', 'email', 'password', 'is_active', 'is_staff', 'is_superuser', 'verified_email')}),
    )

admin.site.register(Member, MemberAdmin)