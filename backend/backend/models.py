import uuid
from datetime import date

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core import validators
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import MemberManager, PositionManager
from .utils.validators import SSNValidator


class Member(AbstractBaseUser, PermissionsMixin):
    """
    TODO NOT DONE
    Represents a member in the system.
    Attributes:
        unicore_id (IntegerField): A unique identifier for the member, which is optional and not editable.
        email (CharField): The email address associated with the member.
        phone_number (CharField): The phone number associated with the member.
        is_superuser (BooleanField): Indicates if the member has superuser privileges.
        is_staff (BooleanField): Indicates if the member can log into the admin site.
        name (CharField): The name of the member.
        ssn (CharField): The social security number of the member.
        study (ForeignKey): A reference to the member's study program.
        registration_year (CharField): The year the member started studying at the TekNat faculty.
        status (CharField): The membership status of the member, with choices including 'unknown', 'nonmember', 'member', and 'alumnus'.
    """

    UNKNOWN = "unknown"
    NONMEMBER = "nonmember"
    MEMBER = "member"
    ALUMNUS = "alumnus"

    MEMBERSHIP_CHOICES = (
        (UNKNOWN, _("Unknown")),
        (NONMEMBER, _("Nonmember")),
        (MEMBER, _("Member")),
        (ALUMNUS, _("Alumnus")),
    )

    USERNAME_FIELD = "ssn"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["email", "name", "phone_number"]

    objects = MemberManager()

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    unicore_id = models.IntegerField(
        blank=True,
        editable=False,
        null=True,
        unique=True,
    )

    # TODO: figure out what this does
    unicore_user_data = None

    email = models.EmailField(
        max_length=255,
        verbose_name=_("Email"),
        help_text=_("Enter an email address that you want to connect to this account."),
    )

    verified_email = models.BooleanField(default=False)

    phone_number = models.CharField(
        max_length=20,
        verbose_name=_("Phone number"),
        help_text=_("Enter a phone number that you want to connect to this account."),
    )

    is_superuser = models.BooleanField(
        help_text=("Designates whether the user is a superuser")
    )

    is_staff = models.BooleanField(
        _("Staff status"),
        default=False,
        help_text=_("Designates whether the user can log into the admin site."),
    )

    # Required by AbstractBaseUser
    is_active = models.BooleanField(
        _("Active"),
        default=True,
        help_text=_(
            "Designates whether this user should be treated as active. "
            "Unselect this instead of deleting accounts."
        ),
    )

    name = models.CharField(
        max_length=254,
        verbose_name=_("Name"),
    )

    ssn = models.CharField(
        max_length=13,
        unique=True,
        verbose_name=_("Social security number"),
    )

    study_program = models.ForeignKey(
        "StudyProgram",
        verbose_name=_("Study program"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    registration_year = models.CharField(
        max_length=4,
        verbose_name=_("Registration year"),
        help_text=_("Enter the year you started studying at the TekNat " "faculty"),
        validators=[
            validators.RegexValidator(
                regex=r"^20\d{2}$", message=_("Please enter a valid year")
            )
        ],
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=MEMBERSHIP_CHOICES,
        verbose_name=_("Membership status"),
        blank=False,
        default=UNKNOWN,
    )

    positions = models.ManyToManyField(
        "Position",
        through="Appointment",
        through_fields=("member", "position"),
        related_name="members",
        verbose_name=_("Positions"),
    )

    def has_perm(self, perm, obj=None):
        if not self.verified_email:
            return False

        # Lets superusers and staff do anything
        if self.is_superuser or self.is_staff:
            return True

        return super().has_perm(perm, obj)

    def has_module_perms(self, app_label):
        if not self.verified_email:
            return False

        # Lets superusers and staff do anything
        if self.is_superuser or self.is_staff:
            return True

        return super().has_module_perms(app_label)

    @staticmethod
    def find_user_by_ssn(ssn):
        """
        Checks if a user exists in our db
        """
        ssn = ssn.strip()

        if SSNValidator()(ssn) is False:
            raise ValueError(_("Invalid SSN format"))

        else:
            try:
                user = Member.objects.filter(ssn=ssn).first()
                if user is not None:
                    return user
            except Exception:
                pass

            return None

    def __str__(self):
        return f"{self.name} ({self.ssn})"


class Position(models.Model):
    """
    Represents a position within an organization.
    Attributes:
        role (ForeignKey): A foreign key to the Role model, representing the role associated with the position.
        recruitment_start (DateField): The start date of the recruitment process.
        recruitment_end (DateField): The deadline for the recruitment process.
        appointed (IntegerField): The number of people appointed to the position.
        term_from (DateTimeField): The date of appointment.
        term_end (DateField): The end date of the appointment.
        comment_eng (TextField): A comment about the position in English.
        comment_sv (TextField): A comment about the position in Swedish.
    """

    objects = PositionManager()

    role = models.ForeignKey(
        "Role",
        related_name="positions",
        on_delete=models.PROTECT,
        blank=False,
    )

    recruitment_start = models.DateField(
        verbose_name=("Start of recruitment"),
        default=date.today,
    )

    recruitment_end = models.DateField(verbose_name=("Recruitment deadline"))
    # ---- Appointment Information ------

    appointed = models.IntegerField(
        verbose_name=("Number of people appointed"),
        help_text=("Enter the number of people to appoint"),
        default=1,
    )

    term_from = models.DateField(verbose_name=("Date of appointment"))
    term_end = models.DateField(verbose_name=("End date of the appointment"))
    comment_eng = models.TextField(verbose_name=("Comment in English"), blank=True)
    comment_sv = models.TextField(verbose_name=("Comment in Swedish"), blank=True)

    def __str__(self):
        return f"{self.role} ({self.term_from} - {self.term_end})"


class Appointment(models.Model):
    """
    Appointment model represents an appointment of a member to a position.
    This is a through table between Member and Position.
    Attributes:
        member (ForeignKey): A foreign key to the Member model.
        position (ForeignKey): A foreign key to the Position model.
        appointed_by (ForeignKey): A foreign key to the Member model who made the appointment.
        appointed_date (DateField): The date when the appointment was made.
        status (CharField): The status of the appointment, default is 'appointed'.
        resignation_date (DateField): The date when the member resigned from the position.
        resignation_reason (TextField): The reason for resignation.
        notes (TextField): Additional notes about the appointment.
    """

    member = models.ForeignKey(
        "Member",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("Member"),
    )

    position = models.ForeignKey(
        "Position",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("Position"),
    )

    appointed_by = models.ForeignKey(
        "Member",
        on_delete=models.SET_NULL,
        related_name="appointments_made",
        null=True,
        blank=True,
        verbose_name=_("Appointed by"),
    )

    appointed_date = models.DateField(
        default=date.today,
        verbose_name=_("Appointed date"),
    )

    APPOINTED = "appointed"
    RESIGNED = "resigned"
    TERMINATED = "terminated"

    STATUS_CHOICES = (
        (APPOINTED, _("Appointed")),
        (RESIGNED, _("Resigned")),
        (TERMINATED, _("Terminated")),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=APPOINTED,
        verbose_name=_("Status"),
    )

    resignation_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Resignation date"),
    )

    resignation_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name=_("Resignation reason"),
    )

    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name=_("Notes"),
    )

    class Meta:
        verbose_name = _("Appointment")
        verbose_name_plural = _("Appointments")
        unique_together = [["member", "position"]]

    def __str__(self):
        return f"{self.member} - {self.position} ({self.status})"


class Reference(models.Model):
    """
    Reference model represents a reference for an application.
    Attributes:
        application (ForeignKey): A foreign key to the Application model, representing the application this reference is associated with.
        name (CharField): The name of the reference. This field is required.
        phone_num (CharField): The phone number of the reference. This field is optional.
        title (CharField): The title or role of the reference. This field is optional.
        email (EmailField): The email address of the reference. This field is optional.
        comment (CharField): A comment about the reference. This field is optional.
    """

    application = models.ForeignKey(
        "Application",
        related_name="reference",
        on_delete=models.CASCADE,
        blank=False,
    )

    name = models.CharField(max_length=255, verbose_name=_("Name"), blank=False)

    phone_num = models.CharField(
        max_length=20,
        verbose_name=_("Phone number"),
        blank=True,
    )

    title = models.CharField(
        max_length=255,
        verbose_name=_("Title/Role"),
        help_text=_("Enter the title or role of the reference"),
        blank=True,
    )

    email = models.EmailField(
        verbose_name=_("Email"),
        help_text=_("Enter the email of the reference"),
        blank=True,
    )

    comment = models.CharField(
        max_length=511,
        verbose_name=_("Comment"),
        help_text=_("Enter a comment about the reference"),
        blank=True,
    )

    def __str__(self):
        return f"{self.name} - {self.application}"


class StudyProgram(models.Model):
    """
    StudyProgram model represents a study program associated with a specific section.
    Attributes:
        section (ForeignKey): A foreign key to the Section model, representing the section to which the study program belongs.
        name_en (CharField): The name of the study program in English.
        name_sv (CharField): The name of the study program in Swedish.
    """

    section = models.ForeignKey(
        "Section",
        related_name="study_programs",
        on_delete=models.CASCADE,
        blank=False,
    )

    name_en = models.CharField(
        max_length=255,
        verbose_name=_("English section name"),
        help_text=_("Enter the name of the section in English"),
        blank=False,
    )

    name_sv = models.CharField(
        max_length=255,
        verbose_name=_("Swedish section name"),
        help_text=_("Enter the name of the section in Swedish"),
    )

    def __str__(self):
        return self.name_en


class Section(models.Model):
    """
    Section model represents a section with its abbreviation in English and Swedish.
    Attributes:
        abbreviation (CharField): The abbreviation of the section, with a maximum length of 20 characters.
        section_en (CharField): The name of the section in English, with a maximum length of 255 characters.
        section_sv (CharField): The name of the section in Swedish, with a maximum length of 255 characters.
    """

    abbreviation = models.CharField(
        max_length=20,
        verbose_name=_("Abbreviation"),
        help_text=_("Enter the abbreviation of the section"),
        blank=False,
    )

    section_en = models.CharField(
        max_length=255,
        verbose_name=_("Section name in English"),
        help_text=_("Enter the name of the section in English"),
        blank=False,
    )

    section_sv = models.CharField(
        max_length=255,
        verbose_name=_("Section name in Swedish"),
        help_text=_("Enter the name of the section in Swedish"),
        blank=False,
    )

    def __str__(self):
        return f"{self.abbreviation} - {self.section_en}"


class Team(models.Model):
    """
    This class represents a working group within UTN
    Attributes:
        name_en (CharField): The name of the committee/working group in English.
        name_sv (CharField): The name of the committee/working group in Swedish.
        logo (ImageField): The logo of the committee/working group.
        desc_en: Description of the committee/working group in English.
        desc_sv: Description of the committee/working group in Swedish.
    """

    name_en = models.CharField(
        max_length=255,
        verbose_name=_("English team name"),
        help_text=_("Enter the name of the team"),
        blank=False,
    )

    name_sv = models.CharField(
        max_length=255,
        verbose_name=_("Swedish team name"),
        help_text=_("Enter the name of the team"),
        blank=False,
    )

    logo = models.ImageField(
        verbose_name=_("Logo"),
        help_text=_("Upload a logo for the team"),
        blank=True,
        upload_to="../media/",
    )

    desc_en = models.TextField(
        verbose_name=_("English team description"),
        help_text=_("Enter a description of the team"),
        blank=True,
    )

    desc_sv = models.TextField(
        verbose_name=_("Swedish team description"),
        help_text=_("Enter a description of the team"),
        blank=True,
    )

    # ------ Administrator settings ------
    # panels = [MultiFieldPanel([
    #     FieldRowPanel([
    #         FieldPanel('name_en'),
    #         FieldPanel('name_sv'),
    #     ]),
    #     ImageChooserPanel('logo'),
    #     FieldPanel('description_en'),
    #     FieldPanel('description_sv'),
    # ])]

    def __str__(self):
        return self.name_en


class Application(models.Model):
    """
    Application model represents an application submitted by a member for a specific position.
    Attributes:
        position (ForeignKey): Foreign key to the Position model, representing the position applied for.
        member (ForeignKey): Foreign key to the Member model, representing the member who submitted the application.
        status (CharField): The current status of the application.
        cover_letter (TextField): The cover letter submitted with the application.
        qualifications (TextField): A summary of relevant qualifications provided by the applicant.
        gdpr (BooleanField): Indicates whether the applicant has accepted the GDPR policy.
        decision_date (DateField): The date when the application was rejected, if applicable.
    """

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DISAPPROVED = "disapproved"
    APPOINTED = "appointed"
    TURNED_DOWN = "turned_down"

    STATUS_CHOICES = (
        (DRAFT, _("Draft")),
        (SUBMITTED, _("Submitted")),
        (APPROVED, _("Approved")),
        (DISAPPROVED, _("Disapproved")),  # TODO Ta bort ?
        (APPOINTED, _("Appointed")),
        (TURNED_DOWN, _("Turned down")),
    )

    position = models.ForeignKey(
        "Position",
        related_name="applications",
        on_delete=models.CASCADE,
        blank=False,
    )

    member = models.ForeignKey(
        "Member",
        on_delete=models.CASCADE,
        blank=False,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        verbose_name=_("Status"),
        blank=False,
        null=False,
    )

    # ---- Application Information ------
    cover_letter = models.TextField(
        verbose_name=_("Cover Letter"),
        help_text=_(
            """Present yourself and state why you are
         who we are looking for"""
        ),
    )
    qualifications = models.TextField(
        verbose_name=_("Qualifications"),
        help_text=_("Give a summary of relevant qualifications"),
    )
    gdpr = models.BooleanField(
        default=False,
        verbose_name=("GDPR"),
        help_text=_(
            """
            I accept that my data is saved in accordance
            with Uppsala Union of Engineering and Science Students integrity
            policy that can be found within the link:
        """
        ),
    )

    decision_date = models.DateField(
        verbose_name=_("Decision date"), null=True, blank=True
    )

    def __str__(self):
        return f"{self.member.name} - {self.position} ({self.status})"


class Role(models.Model):
    """
    This class represents a role within a committee/working group of UTN
    Attributes:
        team (ForeignKey): A foreign key to the Team model, representing the committee/working group this role is associated with.
        role_type (CharField): Level/type of role. Choose between "admin", "fum", "board", "presidium", "group_leader" and "involved". This field is required.
        archived (BooleanField): Marks if a role has been archived - it can no longer be applied to. This field is optional.
        title_en (CharField): The english title/name of the role. This field is required.
        title_sv (CharField): The swedish title/name of the role. This field is required.
        description_en (CharField): The english description of the role. This field is required.
        description_sv (CharField): The swedish description of the role. This field is required.
        contact_email (EmailField): Contact email to highest position within committee/working group. This field is required
    """

    ADMIN = "admin"
    FUM = "fum"
    BOARD = "board"
    PRESIDIUM = "presidium"
    GROUP_LEADER = "group_leader"
    INVOLVED = "involved"

    TYPE_CHOICES = (
        (ADMIN, _("Admin")),
        (FUM, _("FUM")),
        (BOARD, _("Board")),
        (PRESIDIUM, _("Presidium")),
        (GROUP_LEADER, _("Group Leader")),
        (INVOLVED, _("Involved")),
    )

    team = models.ForeignKey(
        "Team",
        related_name="role",
        on_delete=models.CASCADE,
        blank=False,
    )

    role_type = models.CharField(
        max_length=255,
        choices=TYPE_CHOICES,
        verbose_name=_("Role type"),
        blank=False,
        null=False,
    )

    @staticmethod
    def role_type_to_level(role_type):
        """
        Converts the role type to a level.
        0 = admin
        1 = fum
        2 = board
        3 = presidium
        4 = group_leader
        5 = involved
        6 = not in the list
        """

        # Map of role types to levels
        role_levels = {
            Role.ADMIN: 0,
            Role.FUM: 1,
            Role.BOARD: 2,
            Role.PRESIDIUM: 3,
            Role.GROUP_LEADER: 4,
            Role.INVOLVED: 5,
        }

        # Return the corresponding level or 6 if the role_type is not in the dictionary
        return role_levels.get(role_type, 6)

    archived = models.BooleanField(
        verbose_name=_("Archived"),
        help_text=_("Hide the role from menus"),
        default=False,
    )

    title_en = models.CharField(
        max_length=255,
        verbose_name=_("English role name"),
        help_text=_("Enter the name of the role"),
        blank=False,
    )

    title_sv = models.CharField(
        max_length=255,
        verbose_name=_("Swedish role name"),
        help_text=_("Enter the name of the role"),
        blank=False,
    )

    description_en = models.TextField(
        verbose_name=_("English role description"),
        help_text=_("Enter a description of the role"),
        blank=False,
    )

    description_sv = models.TextField(
        verbose_name=_("Swedish role description"),
        help_text=_("Enter a description of the role"),
        blank=False,
    )

    contact_email = models.EmailField(
        verbose_name=_("Contact email address"),
        help_text=_("The email address for the current position holder"),
        blank=False,
    )
    # ------ Administrator settings ------
    # panels = [MultiFieldPanel([
    #     FieldRowPanel([
    #         FieldPanel('name_en'),
    #         FieldPanel('name_sv'),
    #     ]),
    #     FieldPanel('group'),
    #     FieldPanel('election_email'),
    #     FieldPanel('contact_email'),
    #     FieldPanel('phone_number'),
    #     FieldPanel('description_en'),
    #     FieldPanel('description_sv'),
    #     FieldRowPanel([
    #         FieldPanel('archived'),
    #     ]),
    #     FieldPanel('role_type'),
    #     FieldPanel('teams', widget=CheckboxSelectMultiple),
    # ])]

    def __str__(self):
        return f"{self.title_en} ({self.team})"
