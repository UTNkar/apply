# Generated for the FUM (election committee) scope feature.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0014_member_section"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="fum_managed",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Whether the election committee (FUM) may see and manage "
                    "applications for this role"
                ),
                verbose_name="Managed by FUM",
            ),
        ),
    ]
