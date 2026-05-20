from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("backend", "0008_alter_member_is_superuser"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="email_verification_code",
            field=models.CharField(
                blank=True,
                default=None,
                help_text="One-time email verification code",
                max_length=128,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="email_verification_code_expires_at",
            field=models.DateTimeField(
                blank=True,
                default=None,
                help_text="When the email verification code expires",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="email_verification_attempts",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Failed email verification attempts",
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="email_verification_sent_at",
            field=models.DateTimeField(
                blank=True,
                default=None,
                help_text="When the last email verification code was sent",
                null=True,
            ),
        ),
    ]
