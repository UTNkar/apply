from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin

from .models import (
    Member,
    Position,
    Appointment,
    Reference,
    StudyProgram,
    Section,
    Team,
    Application,
    Role,
)


class MemberAdmin(BaseUserAdmin, ModelAdmin):
    """
    Custom admin interface for the Member model.
    Required as we are using ssn as the username instead of a username
    and do not want a username field.
    """

    model = Member
    list_display = ("ssn", "email", "name", "status", "is_staff", "is_active", "verified_email")
    list_filter = ("status", "is_staff", "is_active", "verified_email")
    search_fields = ("ssn", "email", "name")
    ordering = ("ssn", "email")
    list_filter_submit = True

    fieldsets = (
        (None, {"fields": ("ssn", "email", "password")}),
        ("Personal info", {"fields": ("name", "phone_number", "study_program", "registration_year")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "verified_email", "status")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "fields": (
                    "ssn",
                    "email",
                    "password1",
                    "password2",
                    "name",
                    "phone_number",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "verified_email",
                )
            },
        ),
    )


@admin.register(Team)
class TeamAdmin(ModelAdmin):
    list_display = ("name_en", "name_sv")
    search_fields = ("name_en", "name_sv", "desc_en", "desc_sv")
    list_filter_submit = True


@admin.register(Role)
class RoleAdmin(ModelAdmin):
    list_display = ("title_en", "title_sv", "team", "role_type", "archived")
    list_filter = ("team", "role_type", "archived")
    search_fields = ("title_en", "title_sv", "description_en", "description_sv", "team__name_en", "team__name_sv")
    list_filter_submit = True


@admin.register(Position)
class PositionAdmin(ModelAdmin):
    list_display = ("role", "recruitment_start", "recruitment_end", "term_from", "term_end", "appointed")
    list_filter = ("role__team", "recruitment_start", "term_from")
    search_fields = ("role__title_en", "role__title_sv", "comment_eng", "comment_sv")
    list_filter_submit = True
    date_hierarchy = "recruitment_start"


@admin.register(Application)
class ApplicationAdmin(ModelAdmin):
    list_display = ("position", "member", "status", "decision_date")
    list_filter = ("status", "position__role__team")
    search_fields = (
        "position__role__title_en",
        "position__role__title_sv",
        "member__name",
        "member__email",
    )
    list_filter_submit = True


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
    list_display = ("member", "position", "status", "appointed_date", "appointed_by")
    list_filter = ("status", "position__role__team")
    search_fields = ("member__name", "member__email", "position__role__title_en", "position__role__title_sv")
    list_filter_submit = True
    date_hierarchy = "appointed_date"


@admin.register(Reference)
class ReferenceAdmin(ModelAdmin):
    list_display = ("name", "application", "email", "phone_num", "title")
    search_fields = ("name", "email", "application__member__name")
    list_filter_submit = True


@admin.register(Section)
class SectionAdmin(ModelAdmin):
    list_display = ("abbreviation", "section_en", "section_sv")
    search_fields = ("abbreviation", "section_en", "section_sv")
    list_filter_submit = True


@admin.register(StudyProgram)
class StudyProgramAdmin(ModelAdmin):
    list_display = ("name_en", "name_sv", "section")
    list_filter = ("section",)
    search_fields = ("name_en", "name_sv", "section__abbreviation")
    list_filter_submit = True


admin.site.register(Member, MemberAdmin)
