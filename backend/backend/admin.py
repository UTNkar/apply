from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import *


# Register your models here.
class MemberAdmin(UserAdmin):
    """
    Custom admin interface for the Member model.
    Required as we are using ssn as the username instead of a username
    and do not want a username field
    """

    model = Member
    list_display = ("ssn", "email", "name", "is_staff", "is_active", "verified_email")
    search_fields = ("ssn", "email", "name")
    ordering = (
        "ssn",
        "email",
    )
    fieldsets = (
        (None, {"fields": ("ssn", "email", "password")}),
        ("Personal info", {"fields": ("name",)}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "verified_email")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "fields": (
                    "ssn",
                    "email",
                    "password",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "verified_email",
                )
            },
        ),
    )


admin.site.register(Member, MemberAdmin)
admin.site.register(Role)
admin.site.register(Team)
admin.site.register(Position)
admin.site.register(Application)
admin.site.register(Reference)
admin.site.register(Appointment)


class StudyProgramInline(admin.TabularInline):
    model = StudyProgram
    extra = 1


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("abbreviation", "section_en", "section_sv")
    search_fields = ("abbreviation", "section_en", "section_sv")
    inlines = [StudyProgramInline]


@admin.register(StudyProgram)
class StudyProgramAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_sv", "section")
    search_fields = ("name_en", "name_sv", "section__abbreviation")
    list_filter = ("section",)
