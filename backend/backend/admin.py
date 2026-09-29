from datetime import date

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminPasswordChangeForm as BaseAdminPasswordChangeForm
from django.contrib.auth.forms import AdminUserCreationForm as BaseAdminUserCreationForm
from django.contrib.auth.forms import ReadOnlyPasswordHashWidget as BaseReadOnlyPasswordHashWidget
from django.contrib.auth.forms import UserChangeForm as BaseUserChangeForm
from django.contrib.auth.models import Group
from django.db.models import Q
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.decorators import action
from unfold.widgets import UnfoldAdminPasswordToggleWidget

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


def _get_user_team_scopes(user):
    """Return {team_id: {"max_level": best appointer level, "baseline": earliest appointment date}}.

    A member appointed to presidium / group leader may only see applications for
    positions in that team whose recruitment window ends on or after their
    appointment date. Board+ appointers see all applications for the team.
    Returns {} for anonymous / superuser users.
    """
    if not user or not user.is_authenticated or user.is_superuser:
        return {}

    today = date.today()
    rows = (
        Role.objects.filter(
            positions__appointments__member=user,
            positions__appointments__status=Appointment.APPOINTED,
            positions__term_from__lte=today,
            positions__term_end__gte=today,
            role_type__in=Role.appointer_role_types(),
        )
        .values_list(
            "teams__id",
            "role_type",
            "positions__appointments__appointed_date",
        )
        .distinct()
    )

    scopes = {}
    for team_id, role_type, appointed_date in rows:
        if team_id is None:
            continue
        scope = scopes.setdefault(team_id, {"max_level": 6, "baseline": None})
        level = Role.role_type_to_level(role_type)
        if level < scope["max_level"]:
            scope["max_level"] = level
        if appointed_date and (
            scope["baseline"] is None or appointed_date < scope["baseline"]
        ):
            scope["baseline"] = appointed_date
    return scopes


def _application_viewable(application, scopes):
    """Return True if `application` is visible to a user with the given team scopes.

    Board+ level users see every application for the team. Presidium / group
    leader users only see applications for positions whose recruitment window
    ends on or after their appointment date.
    """
    board_level = Role.role_type_to_level(Role.BOARD)
    team_ids = list(application.position.role.teams.values_list("id", flat=True))
    recruitment_end = application.position.recruitment_end
    for team_id in team_ids:
        scope = scopes.get(team_id)
        if not scope:
            continue
        if scope["max_level"] <= board_level:
            return True
        if (
            scope["baseline"] is not None
            and recruitment_end is not None
            and recruitment_end >= scope["baseline"]
        ):
            return True
    return False


def _application_visibility_filter(scopes):
    """Return a Q filter selecting applications visible to a user with the given
    team scopes, or None when nothing is visible."""
    board_level = Role.role_type_to_level(Role.BOARD)
    visibility = Q()
    has_condition = False
    for team_id, scope in scopes.items():
        if scope["max_level"] <= board_level:
            visibility |= Q(position__role__teams=team_id)
            has_condition = True
        elif scope["baseline"] is not None:
            visibility |= Q(
                position__role__teams=team_id,
                position__recruitment_end__gte=scope["baseline"],
            )
            has_condition = True
    return visibility if has_condition else None


def _application_any_viewable(scopes):
    """Return True if the changelist is accessible given the user's team scopes."""
    board_level = Role.role_type_to_level(Role.BOARD)
    return any(
        scope["max_level"] <= board_level or scope["baseline"] is not None
        for scope in scopes.values()
    )
def _current_appointer_roles(user):
    """Return the user's currently held roles with appointer access."""
    if not user or not user.is_authenticated:
        return []

    today = timezone.now().date()
    return list(
        Role.objects.filter(
            positions__appointments__member=user,
            positions__appointments__status=Appointment.APPOINTED,
            positions__term_from__lte=today,
            positions__term_end__gte=today,
            role_type__in=Role.appointer_role_types(),
        )
        .prefetch_related("teams")
        .distinct()
    )


def _strictly_below_role_types(level):
    """Role types that sit strictly below the given level.

    "Below" means a larger role level number. Involved is the lowest privilege.
    Excluding the level prevents horizontal access. A board member will never see
    or manage another board member's role.
    """
    return [
        role_type
        for role_type, _ in Role.TYPE_CHOICES
        if Role.role_type_to_level(role_type) > level
    ]


def role_scope_q(user, prefix=""):
    """Build the Q object (expressed over Role) that the user may see.

    Rules:
    - Superusers / the admin role type: everything.
    - FUM (election committee): can only access roles flagged with fum_managed.
      This is the special case that cuts across levels and teams.
    - Board: everything strictly below board, organisation-wide, except
      for roles flagged fum_managed.
    - Presidium / group leaders: only roles strictly below their own level,
      limited to the teams they belong to.

    prefix lets the same filter be applied to related models, e.g.
    "role__" for Position or "position__role__" for Application.
    """
    if not user or not user.is_authenticated:
        return Q(pk__in=[])

    # Superusers are not restricted at all.
    if getattr(user, "is_superuser", False):
        return Q()

    roles = _current_appointer_roles(user)
    if not roles:
        return Q(pk__in=[])

    # An admin-level appointer is not restricted at all.
    if any(role.role_type == Role.ADMIN for role in roles):
        return Q()

    def field(lookup):
        return f"{prefix}{lookup}" if prefix else lookup

    scope = Q(**{field("pk__in"): []})
    board_level = Role.role_type_to_level(Role.BOARD)

    for role in roles:
        if role.role_type == Role.FUM:
            scope |= Q(**{field("fum_managed"): True})
            continue

        level = Role.role_type_to_level(role.role_type)
        sub = Q(**{field("role_type__in"): _strictly_below_role_types(level)})
        if level == board_level:
            # Board must not touch what the election committee (FUM) owns.
            sub &= ~Q(**{field("fum_managed"): True})
        elif level > board_level:
            # Presidium / group leaders only act within their own teams.
            team_ids = list(role.teams.values_list("id", flat=True))
            sub &= Q(**{field("teams__id__in"): team_ids})
        scope |= sub

    return scope


def _previous_appointments_hidden_q(user):
    """Q matching applications the user must not see because they predate their
    own appointment, or None when nothing needs hiding.

    Presidium / group leader appointers may not see applications for positions in
    their team whose recruitment window closed before they were appointed (GDPR:
    don't reveal who competed for their own role). Board+ appointers are not
    affected. Expressed as a Q over Application.
    """
    scopes = _get_user_team_scopes(user)
    board_level = Role.role_type_to_level(Role.BOARD)
    hidden = None
    for team_id, scope in scopes.items():
        if scope["max_level"] <= board_level:
            continue
        baseline = scope["baseline"]
        if baseline is not None:
            condition = Q(
                position__role__teams=team_id,
                position__recruitment_end__lt=baseline,
            )
            hidden = condition if hidden is None else hidden | condition
    return hidden


class AppointerTeamScopeMixin:
    """Level-based, non-horizontal admin access for appointers.

    Access is derived from the role_type of the roles a member currently
    holds, never from being on the same level as the object:

    - Group leaders see/manage only involved roles within their own teams.
    - Presidium sees/manages group leaders and involved roles in their teams.
    - Board sees/manages everything strictly below board, organisation-wide,
      except roles flagged fum_managed (the election committee owns those).
    - FUM (election committee) is special and only sees/manages roles flagged
      fum_managed.

    No user can see or manage roles at their own level (no horizontal access)
    except for FUM and superuser.
    """

    # Path from the admin's model to Role (e.g. "", "role", "position__role").
    # Subclasses set this.
    role_lookup = ""

    def _get_appointer_team_ids(self, user):
        if not user or not user.is_authenticated or user.is_superuser:
            return []

        team_ids = set()
        for role in _current_appointer_roles(user):
            team_ids.update(role.teams.values_list("id", flat=True))
        return list(team_ids)

    def _is_appointer(self, user):
        return bool(_current_appointer_roles(user))

    def _get_user_max_role_level(self, user):
        """Return the highest privilege level (lowest number) the user holds."""
        if not user or not user.is_authenticated or user.is_superuser:
            return 0

        roles = _current_appointer_roles(user)
        if not roles:
            return 6  # Not an appointer, no appointer roles accessible.

        return min(Role.role_type_to_level(role.role_type) for role in roles)

    def _allowed_role_types(self, user):
        """Role types the user may create / appoint to (strictly below own)."""
        # Admin-level appointers are unrestricted.
        if any(role.role_type == Role.ADMIN for role in _current_appointer_roles(user)):
            return [role_type for role_type, _ in Role.TYPE_CHOICES]

        return _strictly_below_role_types(self._get_user_max_role_level(user))

    def _is_org_wide(self, user):
        """True when the user's scope spans the whole organisation.

        Board, admin and FUM are organisation-wide, whereas presidium and group
        leaders are restricted to their own teams.
        """
        board_level = Role.role_type_to_level(Role.BOARD)
        return any(
            role.role_type == Role.FUM
            or Role.role_type_to_level(role.role_type) <= board_level
            for role in _current_appointer_roles(user)
        )

    def get_scope_q(self, user, role_prefix=None):
        """Scope Q object for the admin's model (or for role_prefix)."""
        if role_prefix is None:
            role_prefix = self.role_lookup
        prefix = f"{role_prefix}__" if role_prefix else ""
        return role_scope_q(user, prefix=prefix)

    def has_module_permission(self, request):
        return request.user.is_superuser or self._is_appointer(request.user)

    def _has_scope(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not self._is_appointer(request.user):
            return False
        if obj is None:
            return True
        if not hasattr(obj, "_meta"):
            obj = self.get_object(request, obj)
            if obj is None:
                return False
        return (
            type(obj)
            .objects.filter(pk=obj.pk)
            .filter(self.get_scope_q(request.user))
            .exists()
        )

    def has_view_permission(self, request, obj=None):
        return self._has_scope(request, obj=obj)

    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        return self._is_appointer(request.user)

    def has_change_permission(self, request, obj=None):
        return self._has_scope(request, obj=obj)

    def has_delete_permission(self, request, obj=None):
        return self._has_scope(request, obj=obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset

        return queryset.filter(self.get_scope_q(request.user)).distinct()

    def _application_in_scope(self, request, application):
        """True when the given Application falls inside the user's scope."""
        if request.user.is_superuser:
            return True
        return self.get_queryset(request).filter(pk=application.pk).exists()

    def delete_queryset(self, request, queryset):
        pk_list = list(queryset.values_list("pk", flat=True))
        if not pk_list:
            return
        self.model._default_manager.filter(pk__in=pk_list).delete()


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    """Group admin with Unfold styling for managing roles/permissions."""

    list_filter_submit = True


class MemberPasswordWidget(BaseReadOnlyPasswordHashWidget):
    """Force render password widgett instead of using the default _render, which
    would just output the HTML"""

    def _render(self, template_name, context, renderer=None):
        return mark_safe(render_to_string(template_name, context).strip())


class MemberPasswordChangeForm(BaseAdminPasswordChangeForm):
    """Admin change-password form for Member, applying Unfold styling to its
    password inputs since they're unstyled by default.
    """

    def __init__(self, user, *args, **kwargs):
        super().__init__(user, *args, **kwargs)
        for field_name in ("password1", "password2"):
            field = self.fields.get(field_name)
            if field is not None:
                field.widget = UnfoldAdminPasswordToggleWidget(
                    attrs={"autocomplete": "new-password"}
                )


class MemberChangeForm(BaseUserChangeForm):
    """Change form for Member. Point the password field at the widget that
    exposes a link to the change-password view."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        password = self.fields.get("password")
        if password:
            password.widget = MemberPasswordWidget()


class MemberAddForm(BaseAdminUserCreationForm):
    """The default AdminUserCreationForm declares password1/password2 with a
    bare PasswordInput, so they bypass Unfold's formfield_overrides and render
    unstyled. Point them at Unfold's password widget instead.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ("password1", "password2"):
            field = self.fields.get(field_name)
            if field is not None:
                field.widget = UnfoldAdminPasswordToggleWidget(
                    attrs={"autocomplete": "new-password"}
                )


@admin.register(Member)
class MemberAdmin(BaseUserAdmin, ModelAdmin):
    """
    Custom admin interface for the Member model.
    Required as we are using ssn as the username instead of a username
    and do not want a username field.
    """

    model = Member
    add_form = MemberAddForm
    form = MemberChangeForm
    change_password_form = MemberPasswordChangeForm
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
        return request.user.is_superuser

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
    role_lookup = ""

    list_display = (
        "title_en",
        "title_sv",
        "display_teams",
        "role_type",
        "fum_managed",
        "archived",
    )
    list_filter = ("teams", "role_type", "fum_managed", "archived")
    search_fields = (
        "title_en",
        "title_sv",
        "description_en",
        "description_sv",
        "teams__name_en",
        "teams__name_sv",
    )
    list_filter_submit = True
    filter_horizontal = ("teams",)

    @admin.display(description=_("Teams"))
    def display_teams(self, obj):
        return ", ".join(obj.teams.values_list("name_en", flat=True))

    def get_form(self, request, obj=None, **kwargs):
        # Remember the edited instance so the role_type choice field can keep
        # its current value even when it sits outside the allowed types.
        self._editing_obj = obj
        return super().get_form(request, obj=obj, **kwargs)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if (
            not request.user.is_superuser
            and db_field.name == "teams"
            and not self._is_org_wide(request.user)
        ):
            team_ids = self._get_appointer_team_ids(request.user)
            kwargs["queryset"] = Team.objects.filter(id__in=team_ids)
        return super().formfield_for_manytomany(db_field, request, **kwargs)

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "role_type" and not request.user.is_superuser:
            allowed_types = set(self._allowed_role_types(request.user))
            editing_obj = getattr(self, "_editing_obj", None)
            if editing_obj is not None:
                allowed_types.add(editing_obj.role_type)
            kwargs["choices"] = [
                (rt, label)
                for rt, label in Role.TYPE_CHOICES
                if rt in allowed_types
            ]
        return super().formfield_for_choice_field(db_field, request, **kwargs)


@admin.register(Position)
class PositionAdmin(AppointerTeamScopeMixin, ModelAdmin):
    role_lookup = "role"

    list_display = (
        "role",
        "recruitment_start",
        "recruitment_end",
        "term_from",
        "term_end",
        "appointed",
    )
    list_filter = ("role__teams", "recruitment_start", "term_from")
    search_fields = ("role__title_en", "role__title_sv", "comment_eng", "comment_sv")
    list_filter_submit = True
    date_hierarchy = "recruitment_start"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "role":
            kwargs["queryset"] = Role.objects.filter(
                self.get_scope_q(request.user, "")
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class ReferenceInline(admin.TabularInline):
    model = Reference
    extra = 0
    readonly_fields = ("name", "phone_num", "title", "email", "comment")
    can_delete = False

    def _has_application_scope(self, request, obj=None):
        if request.user.is_superuser:
            return True

        if obj is None:
            # The parent admin gates whether the changelist is reachable.
            return True

        queryset = Application.objects.filter(pk=obj.pk).filter(
            role_scope_q(request.user, "position__role__")
        )
        hidden = _previous_appointments_hidden_q(request.user)
        if hidden is not None:
            queryset = queryset.exclude(hidden)
        return queryset.exists()

    def has_view_permission(self, request, obj=None):
        return self._has_application_scope(request, obj)

    def has_change_permission(self, request, obj=None):
        return self._has_application_scope(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self._has_application_scope(request, obj)

    def has_add_permission(self, request, _obj=None):
        return False

@admin.register(Application)
class ApplicationAdmin(AppointerTeamScopeMixin, ModelAdmin):
    role_lookup = "position__role"

    list_display = ("position", "member", "status", "decision_date")
    list_filter = ("status", "position__role__teams")
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

    def get_queryset(self, request):
        """Applications allowed by the level/FUM scope (from the mixin), minus
        the ones that predate the user's own appointment (GDPR)."""
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset

        hidden = _previous_appointments_hidden_q(request.user)
        if hidden is not None:
            queryset = queryset.exclude(hidden)
        return queryset.distinct()

    def _has_application_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not self._is_appointer(request.user):
            return False
        if obj is None:
            return True
        if not hasattr(obj, "_meta"):
            obj = self.get_object(request, obj)
            if obj is None:
                return False

        return self.get_queryset(request).filter(pk=obj.pk).exists()

    def has_view_permission(self, request, obj=None):
        return self._has_application_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        return self._has_application_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self._has_application_permission(request, obj)

    @action(
        description=_("Appoint"),
        icon="check_circle",
        permissions=["change"],
    )
    def appoint_application(self, request, object_id):
        application = Application.objects.select_related(
            "position", "member", "position__role"
        ).get(pk=object_id)

        if not self._application_in_scope(request, application):
            messages.error(
                request,
                _("You do not have permission to manage this application."),
            )
            return redirect(
                reverse("admin:backend_application_change", args=[object_id])
            )

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

        if not self._application_in_scope(request, application):
            messages.error(
                request,
                _("You do not have permission to manage this application."),
            )
            return redirect(
                reverse("admin:backend_application_change", args=[object_id])
            )

        application.status = Application.TURNED_DOWN
        application.decision_date = date.today()
        application.save(update_fields=["status", "decision_date"])
        messages.success(request, _("Application turned down."))
        return redirect(reverse("admin:backend_application_change", args=[object_id]))

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "position":
            kwargs["queryset"] = Position.objects.filter(
                self.get_scope_q(request.user, "role")
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Appointment)
class AppointmentAdmin(AppointerTeamScopeMixin, ModelAdmin):
    role_lookup = "position__role"

    list_display = ("member", "position", "status", "appointed_date", "appointed_by")
    list_filter = ("status", "position__role__teams")
    search_fields = (
        "member__name",
        "member__email",
        "position__role__title_en",
        "position__role__title_sv",
    )
    list_filter_submit = True
    date_hierarchy = "appointed_date"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "position":
            kwargs["queryset"] = Position.objects.filter(
                self.get_scope_q(request.user, "role")
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def has_add_permission(self, request):
        return False


@admin.register(Section)
class SectionAdmin(ModelAdmin):
    list_display = ("abbreviation", "section_en", "section_sv")
    search_fields = ("abbreviation", "section_en", "section_sv")
    list_filter_submit = True

    def has_add_permission(self, request):
        return request.user.is_superuser


@admin.register(StudyProgram)
class StudyProgramAdmin(ModelAdmin):
    list_display = ("name_en", "name_sv", "degree", "display_sections")
    search_fields = ("name_en", "name_sv", "sections__abbreviation")
    list_filter = ("sections", "degree")
    list_filter_submit = True
    filter_horizontal = ("sections",)

    def has_add_permission(self, request):
        return request.user.is_superuser

    @admin.display(description=_("Sections"))
    def display_sections(self, obj):
        return ", ".join(obj.sections.values_list("abbreviation", flat=True))

