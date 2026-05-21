from datetime import date

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.decorators import action

from .models import (
    Application,
    Appointment,
    Member,
    Position,
    Reference,
    Role,
    Section,
    StudyProgram,
    Team,
)

admin.site.unregister(Group)


class AppointerTeamScopeMixin:
    """Restrict admin access to objects within the teams the appointer is a part of."""

    def _get_appointer_team_ids(self, user):
        if not user or not user.is_authenticated or user.is_superuser:
            return []

        if hasattr(user, "get_appointer_team_ids"):
            return user.get_appointer_team_ids()

        return []

    def _is_appointer(self, user):
        return len(self._get_appointer_team_ids(user)) > 0

    def get_team_filter(self, team_ids):
        return {}

    def get_object_team_id(self, obj):
        return None

    def has_module_permission(self, request):
        return request.user.is_superuser or self._is_appointer(request.user)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not self._is_appointer(request.user):
            return False
        if obj is None:
            return True
        return self.get_object_team_id(obj) in self._get_appointer_team_ids(
            request.user
        )

    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        return self._is_appointer(request.user)

    def has_change_permission(self, request, obj=None):
        return self.has_view_permission(request, obj=obj)

    def has_delete_permission(self, request, obj=None):
        return self.has_view_permission(request, obj=obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset

        team_ids = self._get_appointer_team_ids(request.user)
        if not team_ids:
            return queryset.none()

        return queryset.filter(**self.get_team_filter(team_ids)).distinct()


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
    list_display = (
        "ssn",
        "email",
        "name",
        "status",
        "is_staff",
        "is_active",
        "verified_email",
    )
    list_filter = ("status", "is_staff", "is_active", "verified_email")
    search_fields = ("ssn", "email", "name")
    ordering = ("ssn", "email")
    list_filter_submit = True
    filter_horizontal = ("groups", "user_permissions")

    def has_add_permission(self, request):
        return False

    fieldsets = (
        (None, {"fields": ("ssn", "email", "password")}),
        (
            "Personal info",
            {"fields": ("name", "phone_number", "study_program", "registration_year")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "verified_email",
                    "status",
                    "groups",
                    "user_permissions",
                )
            },
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
class RoleAdmin(AppointerTeamScopeMixin, ModelAdmin):
    list_display = ("title_en", "title_sv", "team", "role_type", "archived")
    list_filter = ("team", "role_type", "archived")
    search_fields = (
        "title_en",
        "title_sv",
        "description_en",
        "description_sv",
        "team__name_en",
        "team__name_sv",
    )
    list_filter_submit = True

    def get_team_filter(self, team_ids):
        return {"team_id__in": team_ids}

    def get_object_team_id(self, obj):
        return obj.team_id

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "team":
            team_ids = self._get_appointer_team_ids(request.user)
            kwargs["queryset"] = Team.objects.filter(id__in=team_ids)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Position)
class PositionAdmin(AppointerTeamScopeMixin, ModelAdmin):
    list_display = (
        "role",
        "recruitment_start",
        "recruitment_end",
        "term_from",
        "term_end",
        "appointed",
    )
    list_filter = ("role__team", "recruitment_start", "term_from")
    search_fields = ("role__title_en", "role__title_sv", "comment_eng", "comment_sv")
    list_filter_submit = True
    date_hierarchy = "recruitment_start"

    def get_team_filter(self, team_ids):
        return {"role__team_id__in": team_ids}

    def get_object_team_id(self, obj):
        return obj.role.team_id

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "role":
            team_ids = self._get_appointer_team_ids(request.user)
            kwargs["queryset"] = Role.objects.filter(team_id__in=team_ids)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class ReferenceInline(admin.TabularInline):
    model = Reference
    extra = 0
    readonly_fields = ("name", "phone_num", "title", "email", "comment")
    can_delete = False

    def has_add_permission(self, request, _obj=None):
        return False

@admin.register(Application)
class ApplicationAdmin(AppointerTeamScopeMixin, ModelAdmin):
    list_display = ("position", "member", "status", "decision_date")
    list_filter = ("status", "position__role__team")
    search_fields = (
        "position__role__title_en",
        "position__role__title_sv",
        "member__name",
        "member__email",
    )
    list_filter_submit = True
    inlines = [ReferenceInline]
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

    def get_team_filter(self, team_ids):
        return {"position__role__team_id__in": team_ids}

    def get_object_team_id(self, obj):
        return obj.position.role.team_id

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "position":
            team_ids = self._get_appointer_team_ids(request.user)
            kwargs["queryset"] = Position.objects.filter(role__team_id__in=team_ids)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Appointment)
class AppointmentAdmin(AppointerTeamScopeMixin, ModelAdmin):
    list_display = ("member", "position", "status", "appointed_date", "appointed_by")
    list_filter = ("status", "position__role__team")
    search_fields = (
        "member__name",
        "member__email",
        "position__role__title_en",
        "position__role__title_sv",
    )
    list_filter_submit = True
    date_hierarchy = "appointed_date"

    def get_team_filter(self, team_ids):
        return {"position__role__team_id__in": team_ids}

    def get_object_team_id(self, obj):
        return obj.position.role.team_id

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "position":
            team_ids = self._get_appointer_team_ids(request.user)
            kwargs["queryset"] = Position.objects.filter(role__team_id__in=team_ids)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

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

