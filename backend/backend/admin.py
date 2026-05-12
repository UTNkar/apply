from datetime import date

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import Group
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.decorators import action

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

admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    """Group admin with Unfold styling for managing roles/permissions."""
    list_filter_submit = True


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
    filter_horizontal = ("groups", "user_permissions")

    def has_add_permission(self, request):
        return False

    fieldsets = (
        (None, {"fields": ("ssn", "email", "password")}),
        ("Personal info", {"fields": ("name", "phone_number", "study_program", "registration_year")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "verified_email", "status", "groups",
                        "user_permissions")},
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
    actions_row = ("appoint_application", "turn_down_application")
    actions_detail = ("appoint_application", "turn_down_application")

    def has_add_permission(self, request):
        return False

    @action(
        description=_("Appoint"),
        icon="check_circle",
        permissions=["change"],
    )
    def appoint_application(self, request, object_id):
        application = Application.objects.select_related("position", "member").get(pk=object_id)
        application.status = Application.APPOINTED
        application.decision_date = date.today()
        application.save(update_fields=["status", "decision_date"])
        Appointment.objects.get_or_create(
            member=application.member,
            position=application.position,
            defaults={
                "appointed_by": request.user,
                "appointed_date": date.today(),
                "status": Appointment.APPOINTED,
            },
        )
        messages.success(request, _("Application appointed."))
        return redirect(reverse("admin:backend_application_change", args=[object_id]))

    @action(
        description=_("Turn down"),
        icon="cancel",
        permissions=["change"],
    )
    def turn_down_application(self, request, object_id):
        application = Application.objects.get(pk=object_id)
        application.status = Application.TURNED_DOWN
        application.decision_date = date.today()
        application.save(update_fields=["status", "decision_date"])
        messages.success(request, _("Application turned down."))
        return redirect(reverse("admin:backend_application_change", args=[object_id]))


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
    list_display = ("member", "position", "status", "appointed_date", "appointed_by")
    list_filter = ("status", "position__role__team")
    search_fields = ("member__name", "member__email", "position__role__title_en", "position__role__title_sv")
    list_filter_submit = True
    date_hierarchy = "appointed_date"

    def has_add_permission(self, request):
        return False


@admin.register(Reference)
class ReferenceAdmin(ModelAdmin):
    list_display = ("name", "application", "email", "phone_num", "title")
    search_fields = ("name", "email", "application__member__name")
    list_filter_submit = True

    def has_add_permission(self, request):
        return False

class StudyProgramInline(admin.TabularInline):
    model = StudyProgram
    extra = 1


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("abbreviation", "section_en", "section_sv")
    search_fields = ("abbreviation", "section_en", "section_sv")
    inlines = [StudyProgramInline]
    list_filter_submit = True


@admin.register(StudyProgram)
class StudyProgramAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_sv", "section")
    search_fields = ("name_en", "name_sv", "section__abbreviation")
    list_filter = ("section",)
    list_filter_submit = True

