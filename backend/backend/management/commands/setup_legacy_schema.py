from __future__ import annotations

import os
import subprocess
import shlex
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

"""
Before you run, set these variables:
export POSTGRES_DB=apply
export POSTGRES_USER=apply
export POSTGRES_PORT=5436
export POSTGRES_HOST=localhost
export POSTGRES_PASSWORD=<vault_apply_db_password>
"""

class Command(BaseCommand):
    help = (
        "Restore the legacy dump into a scratch database, copy the legacy tables "
        "into the target database, and run migration/migrate.sql."
        "Requires the legacy dump to be present in the parent directory of the project as apply-dump.sql."
        "Also requires the PostgreSQL client tools to be installed in the backend container."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dump-file",
            default=str(Path(settings.BASE_DIR).parent / "apply-dump.sql"),
            help="Path to the legacy dump file",
        )
        parser.add_argument(
            "--scratch-db",
            default="apply_legacy",
            help="Temporary database used to stage the legacy dump",
        )
        parser.add_argument(
            "--target-db",
            default=settings.DATABASES["default"]["NAME"],
            help="Target database that already has the Django schema applied",
        )
        parser.add_argument(
            "--recreate-target",
            action="store_true",
            help="Drop and recreate the target database before running",
        )

    def handle(self, *args, **options):
        dump_file = Path(options["dump_file"])
        scratch_db = options["scratch_db"]
        target_db = options["target_db"]
        recreate_target = options["recreate_target"]

        if not dump_file.exists():
            raise CommandError(f"Dump file not found: {dump_file}")

        db_settings = settings.DATABASES["default"]
        host = db_settings.get("HOST") or "localhost"
        port = str(db_settings.get("PORT") or 5432)
        user = db_settings.get("USER") or "postgres"
        password = db_settings.get("PASSWORD") or ""
        admin_db = "postgres"

        env = os.environ.copy()
        env["PGHOST"] = host
        env["PGPORT"] = port
        env["PGUSER"] = user
        if password:
            env["PGPASSWORD"] = password

        self.stdout.write(self.style.NOTICE("Preparing legacy migration staging..."))

        try:
            self.stdout.write(self.style.NOTICE("Ensuring legacy owner role exists..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    admin_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "DO $$ BEGIN CREATE ROLE moore; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
                ],
            )

            if recreate_target:
                self._terminate_connections(env, target_db)
                self._run(env, ["dropdb", "--if-exists", target_db], allow_failure=True)
                self._run(env, ["createdb", target_db])
                self.stdout.write(self.style.NOTICE("Applying Django migrations to fresh target DB..."))
                self._run(env, ["python", "manage.py", "migrate"], stream_output=True)

            self._terminate_connections(env, scratch_db)
            self._run(env, ["dropdb", "--if-exists", scratch_db], allow_failure=True)
            self._run(env, ["createdb", scratch_db])

            self.stdout.write(self.style.NOTICE("Restoring legacy dump into scratch DB..."))
            restore_command = (
                f"sed '/transaction_timeout/d' {shlex.quote(str(dump_file))} "
                f"| psql -d {shlex.quote(scratch_db)}"
            )
            self._run(env, ["bash", "-lc", restore_command], stream_output=True)

            self.stdout.write(self.style.NOTICE("Renaming public schema to legacy..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    scratch_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "ALTER SCHEMA public RENAME TO legacy;",
                ],
            )

            self.stdout.write(self.style.NOTICE("Copying legacy tables into target DB..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    target_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "DROP SCHEMA IF EXISTS legacy CASCADE; CREATE SCHEMA legacy;",
                ],
            )
            dump_command = (
                "set -o pipefail && "
                f"pg_dump -d {shlex.quote(scratch_db)} --section=pre-data --section=data --no-owner "
                "-t 'legacy.involvement_*' -t 'legacy.members_*' -t legacy.auth_group "
                "| sed '/transaction_timeout/d' "
                f"| psql -d {shlex.quote(target_db)} -v ON_ERROR_STOP=1"
            )
            self._run(env, ["bash", "-lc", dump_command], stream_output=True)

            self.stdout.write(self.style.NOTICE("Ensuring pgcrypto and running SQL migration..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    target_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
                ],
            )
            self.stdout.write(self.style.NOTICE("Truncating target data tables..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    target_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    (
                        "TRUNCATE backend_member, backend_team, backend_section, "
                        "backend_studyprogram, backend_role, backend_position, "
                        "backend_application, backend_reference, backend_appointment, "
                        "auth_group RESTART IDENTITY CASCADE;"
                    ),
                ],
            )
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    target_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-f",
                    str(Path(settings.BASE_DIR).parent / "migration" / "migrate.sql"),
                ],
            )

            self.stdout.write(self.style.NOTICE("Dropping legacy schema after migration..."))
            self._run(
                env,
                [
                    "psql",
                    "-d",
                    target_db,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "DROP SCHEMA IF EXISTS legacy CASCADE;",
                ],
            )

        finally:
            self.stdout.write(self.style.NOTICE("Cleaning up scratch DB..."))
            self._terminate_connections(env, scratch_db)
            self._run(env, ["dropdb", "--if-exists", scratch_db], allow_failure=True)

        self.stdout.write(self.style.SUCCESS("Legacy data migration completed successfully."))

    def _terminate_connections(self, env: dict, database_name: str) -> None:
        query = (
            "SELECT pg_terminate_backend(pid) "
            f"FROM pg_stat_activity WHERE datname = '{database_name}' AND pid <> pg_backend_pid();"
        )
        self._run(
            env,
            ["psql", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query],
            allow_failure=True,
        )

    def _run(
        self,
        env: dict,
        command: list[str],
        allow_failure: bool = False,
        stream_output: bool = False,
    ) -> None:
        if stream_output:
            result = subprocess.run(command, env=env, check=False)
        else:
            result = subprocess.run(command, env=env, capture_output=True, text=True)
            if result.stdout:
                self.stdout.write(result.stdout)
            if result.stderr:
                self.stderr.write(result.stderr)
        if result.returncode != 0 and not allow_failure:
            raise CommandError(
                f"Command failed with exit code {result.returncode}: {' '.join(command)}"
            )
