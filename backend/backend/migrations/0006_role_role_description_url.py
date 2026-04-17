from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0005_alter_team_logo"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="role_description_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="Optional URL to a full role description",
                verbose_name="Role description URL",
            ),
        ),
    ]
