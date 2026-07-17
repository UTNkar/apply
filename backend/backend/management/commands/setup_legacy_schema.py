from __future__ import annotations

import os
import subprocess
import shlex
import sys
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
        parser.add_argument(
            "--moore-connection",
            nargs="?",
            const="",
            default=None,
            help="SSH connection string (user@host) for pulling team logos from "
            "the old Wagtail server.  If given without a value you will be "
            "prompted interactively.  Omit to skip logo pulling entirely.\n"
            "If the moore server requires SSH key authentication, mount your "
            "~/.ssh directory:\n"
            '  docker compose run --rm -v "$HOME/.ssh:/root/.ssh:ro" '
            "backend python manage.py setup_legacy_schema --moore-connection …",
        )
        parser.add_argument(
            "--moore-remote-dir",
            default="/var/www/moore/src/media/images",
            help="Remote directory on the moore server containing Wagtail original "
            "images (default: /var/www/moore/src/media/images).",
        )

    def handle(self, *args, **options):
        dump_file = Path(options["dump_file"])
        scratch_db = options["scratch_db"]
        target_db = options["target_db"]
        recreate_target = options["recreate_target"]
        moore_connection: str | None = options["moore_connection"]
        moore_remote_dir: str = options["moore_remote_dir"]

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
                "-t 'legacy.wagtailimages_image' "
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

            # ------------------------------------------------------------------
            # Optional: pull team logo images from the old moore server
            # ------------------------------------------------------------------
            if moore_connection is not None:
                if moore_connection == "":
                    moore_connection = self._prompt(
                        "SSH connection string (user@host) for pulling team logos"
                    )
                self._pull_team_logos(moore_connection, moore_remote_dir)

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

    # ------------------------------------------------------------------
    # Team logo pulling helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _wagtail_original_path(filename: str) -> str:
        """Insert ``.original`` before the file extension.

        Wagtail stores the raw upload as ``foo.original.png`` while the
        ``file`` column in ``wagtailimages_image`` points to ``foo.png``.
        """
        filename = filename.replace("160x160", "") # Remove size suffix
        stem, dot, ext = filename.rpartition(".")
        return f"{stem}.original{dot}{ext}"

    def _pull_team_logos(self, connection: str, remote_dir: str) -> None:
        """SCP team logo originals from moore, then crop a left-aligned square
        and resize to 160x160 px (retina-ready for 80x80 display) with ffmpeg.

        The database points to ``team_logos/foo.png`` (cropped square).
        The original is kept as ``team_logos/foo.original.png`` for reference.

        .. note::

            If the moore server requires SSH key authentication, mount your
            ``~/.ssh`` directory into the container when running this command::

                docker compose -f docker-compose.yml \\
                    run --rm -v "$HOME/.ssh:/root/.ssh:ro" \\
                    backend python manage.py setup_legacy_schema --moore-connection …
        """
        from backend.models import Team

        SQUARE_SIZE = 160  # 2× for retina, displayed at 80×80

        self.stdout.write(self.style.NOTICE("Pulling team logos from moore server..."))

        teams = Team.objects.exclude(logo="").values_list("logo", flat=True)
        logo_paths = sorted(set(teams))

        if not logo_paths:
            self.stdout.write(self.style.WARNING("No team logos found in the database."))
            return

        self.stdout.write(f"Found {len(logo_paths)} unique logo filenames.")

        dest_dir = Path(settings.MEDIA_ROOT) / "team_logos"
        dest_dir.mkdir(parents=True, exist_ok=True)

        succeeded = 0
        failed = 0
        auth_failures = 0

        for logo_path in logo_paths:
            # logo_path is e.g. "team_logos/BAS.png"
            filename = Path(logo_path).name  # "BAS.png"
            original_name = self._wagtail_original_path(filename)  # "BAS.original.png"

            remote = f"{connection}:{remote_dir}/{original_name}"
            original_dest = dest_dir / original_name   # kept for reference
            # Insert size suffix before extension: BAS.png → BAS160x160.png
            square_dest = dest_dir / filename   # cropped version → DB

            self.stdout.write(f"  {remote}", ending="")

            try:
                # 1. Pull the Wagtail original from moore
                result = subprocess.run(
                    ["scp", "-F", "/dev/null", "-o", "ConnectTimeout=10",
                     "-o", "StrictHostKeyChecking=no", remote, str(original_dest)],
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    stderr = result.stderr.strip()
                    if "Permission denied" in stderr:
                        auth_failures += 1
                        if auth_failures == 1:
                            # Only print the help message once
                            self.stdout.write(self.style.ERROR("  PERMISSION DENIED"))
                            self.stderr.write(
                                "\n"
                                + self.style.ERROR(
                                    "SSH key authentication failed. "
                                    "Mount your ~/.ssh directory and try again:\n"
                                    "  docker compose -f docker-compose.yml \\\n"
                                    "    run --rm -v \"$HOME/.ssh:/root/.ssh:ro\" \\\n"
                                    "    backend python manage.py setup_legacy_schema "
                                    "--moore-connection …\n"
                                )
                            )
                        continue
                    raise subprocess.CalledProcessError(
                        result.returncode, ["scp", "...", remote, str(original_dest)],
                        output=result.stdout, stderr=result.stderr,
                    )

                # 2. Crop largest possible square from the left edge, resize
                #    The \\, escapes commas inside min() for ffmpeg's filter parser.
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y", "-v", "error",
                        "-i", str(original_dest),
                        "-vf",
                        f"crop=min(in_w\\,in_h):min(in_w\\,in_h):0:0,scale={SQUARE_SIZE}:{SQUARE_SIZE}",
                        str(square_dest),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )

                self.stdout.write(self.style.SUCCESS("  OK"))
                succeeded += 1
            except subprocess.CalledProcessError as exc:
                self.stdout.write(self.style.ERROR("  FAILED"))
                err = exc.stderr.strip() if exc.stderr else str(exc)
                if err:
                    self.stderr.write(f"    {err}")
                failed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Team logo pull done: {succeeded} pulled & cropped, {failed} failed."
            )
        )

    @staticmethod
    def _prompt(text: str) -> str:
        """Print a prompt to stderr and return the user's answer."""
        sys.stderr.write(f"{text}: ")
        sys.stderr.flush()
        return sys.stdin.readline().rstrip("\n")
