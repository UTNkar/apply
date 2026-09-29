"""Flag the roles that the election committee (FUM) is responsible for.

FUM is special: instead of the usual "everything strictly below my own level"
rule, it may only see and manage applications for a fixed set of roles. These
roles are spread across several teams (and a couple of them even live inside
teams that also contain unrelated roles), so they are marked with an explicit
fum_managed flag rather than being derived from the team or role type.
"""

from django.db import migrations
from django.db.models import Q

# Whole teams that are entirely FUM's responsibility.
FUM_TEAM_NAMES_EN = [
    "The board",
    "Election committee",
    "Presiding committee of the council",
    "Internal auditors",
    "Techna",
    "The union magazine Techna",
]

FUM_TEAM_NAMES_SV = [
    "Styrelsen",
    "Valberedningen",
    "Talmanspresidiet",
    "Internrevisorer",
]

# Individual roles that live inside unrelated teams (e.g. the historiography
# and the student representative on the university board).
FUM_ROLE_TITLES_EN = [
    "Member of the University Board",
]
FUM_ROLE_TITLES_SV = [
    "Konsistorieledamot",
]

# "Historiographer" / "Historiograf" exists in several year-suffixed variants
# (e.g. VT26), so match them by prefix.
FUM_ROLE_TITLE_PREFIXES_EN = ["Historiographer"]
FUM_ROLE_TITLE_PREFIXES_SV = ["Historiograf"]


def _fum_role_filter():
    query = Q(teams__name_en__in=FUM_TEAM_NAMES_EN) | Q(
        teams__name_sv__in=FUM_TEAM_NAMES_SV
    )
    query |= Q(title_en__in=FUM_ROLE_TITLES_EN) | Q(title_sv__in=FUM_ROLE_TITLES_SV)
    for prefix in FUM_ROLE_TITLE_PREFIXES_EN:
        query |= Q(title_en__startswith=prefix)
    for prefix in FUM_ROLE_TITLE_PREFIXES_SV:
        query |= Q(title_sv__startswith=prefix)
    return query


def flag_fum_managed_roles(apps, schema_editor):
    Role = apps.get_model("backend", "Role")
    Role.objects.filter(_fum_role_filter()).distinct().update(fum_managed=True)


def unflag_fum_managed_roles(apps, schema_editor):
    Role = apps.get_model("backend", "Role")
    Role.objects.filter(fum_managed=True).update(fum_managed=False)


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0015_role_fum_managed"),
    ]

    operations = [
        migrations.RunPython(
            flag_fum_managed_roles,
            reverse_code=unflag_fum_managed_roles,
        ),
    ]
