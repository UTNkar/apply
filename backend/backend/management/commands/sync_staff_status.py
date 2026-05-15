from django.core.management.base import BaseCommand
from backend.models import Member, _sync_staff_status


class Command(BaseCommand):
    help = (
        "Syncs the is_staff status for all members based on their active appointments."
    )

    def handle(self, *args, **options):
        self.stdout.write("Starting to sync staff statuses...")

        members = Member.objects.all()
        updated_count = 0

        for member in members:
            old_status = member.is_staff
            _sync_staff_status(member)
            if member.is_staff != old_status:
                updated_count += 1
                self.stdout.write(
                    f"Updated {member.name} ({member.ssn}): is_staff changed from {old_status} to {member.is_staff}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully synced staff status. {updated_count} member(s) had their status updated."
            )
        )
