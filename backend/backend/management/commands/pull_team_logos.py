from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Pull team logo images from the old moore Wagtail server, crop them "
        "to a left-aligned 160x160 px square (for 80x80 display on apply), "
        "and push both the original and the cropped version to the turing "
        "server.\n\n"
        "Images are SCP'd from moore -> local (for ffmpeg processing) -> turing.\n\n"
        "Run this on your local computer BEFORE running setup_legacy_schema "
        "on the server.  Since the servers requires SSH key authentication, "
        "mount your ~/.ssh directory:\n\n"
        '  docker compose run --rm -v "$HOME/.ssh:/root/.ssh:ro" \\\n'
        "      backend python manage.py pull_team_logos \\\n"
        "      --moore-connection user@moore:/var/www/moore/src/media/images \\\n"
        "      --turing-connection user@turing:/data/apply/backend/media/team_logos"
        "Replace connection strings above with your own SSH username and the"
        "correct hostnames and paths on the servers."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--moore-connection",
            nargs="?",
            const="",
            default=None,
            help=(
                "Full SCP remote path for the *source* moore Wagtail server, "
                "e.g.\nuser@moore:/var/www/moore/src/media/images\n"
                "The directory portion must point to the Wagtail original "
                "images directory.\n"
                "If given without a value you will be prompted interactively."
            ),
        )
        parser.add_argument(
            "--turing-connection",
            nargs="?",
            const="",
            default=None,
            help=(
                "Full SCP remote path for the *destination* turing server, "
                "e.g.\nuser@turing:/data/apply/backend/media/team_logos\n"
                "Final images (original + cropped square) are placed here.\n"
                "If given without a value you will be prompted interactively."
            ),
        )

    def handle(self, *args, **options):
        moore_connection: str | None = options["moore_connection"]
        turing_connection: str | None = options["turing_connection"]

        if moore_connection is None:
            raise CommandError(
                "--moore-connection is required.  Provide a full SCP remote "
                "path like user@moore:/var/www/moore/src/media/images"
            )
        if moore_connection == "":
            moore_connection = self._prompt(
                "Source SCP path (user@moore:/var/www/moore/src/media/images)"
            )

        if turing_connection is None:
            raise CommandError(
                "--turing-connection is required.  Provide a full SCP remote "
                "path like user@turing:/data/apply/backend/media/team_logos"
            )
        if turing_connection == "":
            turing_connection = self._prompt(
                "Destination SCP path "
                "(user@turing:/data/apply/backend/media/team_logos)"
            )

        self._pull_team_logos(moore_connection, turing_connection)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _wagtail_original_path(filename: str) -> str:
        """Insert ``.original`` before the file extension.

        Wagtail stores the raw upload as ``foo.original.png`` while the
        ``file`` column in ``wagtailimages_image`` points to ``foo.png``.
        """
        filename = filename.replace("160x160", "")  # Remove any size suffix
        stem, dot, ext = filename.rpartition(".")
        return f"{stem}.original{dot}{ext}"

    def _pull_team_logos(
        self, moore_connection: str, turing_connection: str
    ) -> None:
        """SCP team logo originals from moore → local → turing.

        ``moore_connection`` is the full SCP remote path to the Wagtail
        original images directory, e.g.
        ``user@moore:/var/www/moore/src/media/images``.

        ``turing_connection`` is the full SCP remote path where the final
        files (original + cropped square) should land, e.g.
        ``user@turing:/data/apply/backend/media/team_logos``.

        ffmpeg processing happens on the local machine between the two SCP
        transfers.

        The database points to ``team_logos/foo.png`` (cropped square).
        The original is kept as ``team_logos/foo.original.png`` for reference.
        """
        from backend.models import Team

        SQUARE_SIZE = 160  # 2× for retina, displayed at 80×80

        self.stdout.write(
            self.style.NOTICE("Pulling team logos from moore server...")
        )

        teams = Team.objects.exclude(logo="").values_list("logo", flat=True)
        logo_paths = sorted(set(teams))

        if not logo_paths:
            self.stdout.write(
                self.style.WARNING("No team logos found in the database.")
            )
            return

        self.stdout.write(f"Found {len(logo_paths)} unique logo filenames.")

        work_dir = Path(settings.MEDIA_ROOT) / "team_logos"
        work_dir.mkdir(parents=True, exist_ok=True)

        succeeded = 0
        failed = 0

        for logo_path in logo_paths:
            # logo_path is e.g. "team_logos/BAS.png"
            filename = Path(logo_path).name  # "BAS.png"
            original_name = self._wagtail_original_path(filename)

            moore_remote = f"{moore_connection}/{original_name}"
            original_local = work_dir / original_name
            square_local = work_dir / filename

            self.stdout.write(f"  {moore_remote}", ending="")

            try:
                # 1. SCP original from moore → local
                self._scp(moore_remote, str(original_local))

                # 2. Crop & resize on local with ffmpeg
                #    \\, escapes commas inside min() for ffmpeg's filter parser.
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y", "-v", "error",
                        "-i", str(original_local),
                        "-vf",
                        (
                            f"crop=min(in_w\\,in_h):min(in_w\\,in_h):0:0,"
                            f"scale={SQUARE_SIZE}:{SQUARE_SIZE}"
                        ),
                        str(square_local),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )

                # 3. SCP both files from local → turing
                turing_original = f"{turing_connection}/{original_name}"
                turing_square = f"{turing_connection}/{filename}"
                self._scp(str(original_local), turing_original)
                self._scp(str(square_local), turing_square)

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
                f"Team logo pull done: {succeeded} pulled, cropped & pushed, "
                f"{failed} failed."
            )
        )

    @staticmethod
    def _scp(source: str, dest: str) -> None:
        """Run ``scp source dest`` with standard options, raising on failure."""
        result = subprocess.run(
            [
                "scp",
                "-F", "/dev/null",
                "-o", "ConnectTimeout=10",
                "-o", "StrictHostKeyChecking=no",
                source,
                dest,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise subprocess.CalledProcessError(
                result.returncode,
                ["scp", source, dest],
                output=result.stdout,
                stderr=result.stderr,
            )

    @staticmethod
    def _prompt(text: str) -> str:
        """Print a prompt to stderr and return the user's answer."""
        sys.stderr.write(f"{text}: ")
        sys.stderr.flush()
        return sys.stdin.readline().rstrip("\n")
