from django.db import models
from datetime import date
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import UserManager
from django.core import validators

# from wagtail.admin.edit_handlers import MultiFieldPanel, FieldPanel, \
#     FieldRowPanel


class Member(models.Model):
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
        verbose_name=_('Email'),
        help_text=_('Enter an email address that you want to connect to this account.')
    )
    
    phone_number = models.CharField(
        max_length=20,
        verbose_name=_('Phone number'),
        help_text=_('Enter a phone number that you want to connect to this account.'),
    )

    is_superuser = models.BooleanField(
        help_text=('Designates whether the user is a superuser')
    )

    is_staff = models.BooleanField(
        _('Staff status'),
        default=False,
        help_text=_('Designates whether the user can log into the admin site.'),
    )

    name = models.CharField(
        max_length=254,
        verbose_name=_('Name'),
    )

    ssn = models.CharField(
        max_length=13,
        verbose_name=_('Social security number'),
    )

    study_program = models.ForeignKey(
        'StudyProgram',
        verbose_name=_('Study program'),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    registration_year = models.CharField(
        max_length=4,
        verbose_name=_('Registration year'),
        help_text=_('Enter the year you started studying at the TekNat '
                    'faculty'),
        validators=[validators.RegexValidator(
            regex=r'^20\d{2}$',
            message=_('Please enter a valid year')
        )],
        blank=True,
    )

    MEMBERSHIP_CHOICES = (
        ('unknown', _('Unknown')),
        ('nonmember', _('Nonmember')),
        ('member', _('Member')),
        ('alumnus', _('Alumnus')),
    )
    
    status = models.CharField(
        max_length=20,
        choices=MEMBERSHIP_CHOICES,
        verbose_name=_('Membership status'),
        blank=False,
        default='unknown'
    )
    
    
class Position(models.Model):
    """
    Represents a position within an organization.
    Attributes:
        mandate_history (ManyToManyField): A many-to-many relationship with MandateHistory, representing the mandate history associated with the position.
        role (ForeignKey): A foreign key to the Role model, representing the role associated with the position.
        recruitment_start (DateField): The start date of the recruitment process.
        recruitment_end (DateField): The deadline for the recruitment process.
        appointed (IntegerField): The number of people appointed to the position.
        term_from (DateTimeField): The date of appointment.
        term_end (DateField): The end date of the appointment.
        comment_eng (TextField): A comment about the position in English.
        comment_sv (TextField): A comment about the position in Swedish.
    """
    
    mandate_history = models.ManyToManyField(
        'MandateHistory',
        related_name= 'positions',
        blank=False
    )

    role = models.ForeignKey(
        'Role',
        related_name='positions',
        on_delete=models.PROTECT,
        blank=False,
    )
    
    recruitment_start = models.DateField(
        verbose_name=('Start of recruitment'),
        default= date.today,
    )
    
    recruitment_end = models.DateField(
        verbose_name=('Recruitment deadline')
    )
    # ---- Appointment Information ------

    appointed = models.IntegerField(
        verbose_name=('Number of people appointed'),
        help_text=('Enter the number of people to appoint'),
        default=1,
    )
    
    term_from = models.DateTimeField(
        verbose_name=('Date of appointment')
    )

    term_end = models.DateField(
        verbose_name=('End date of the appointment')
    )

    comment_eng = models.TextField(
        verbose_name=('Comment in English'),
        blank=True
    )

    comment_sv = models.TextField(
        verbose_name=('Comment in Swedish'),
        blank=True
    )
    
class MandateHistory(models.Model):
    """
    This model shows the mandate history of a UTN member
    Attribute:
        member: A many to many relation to the member
    """
    member = models.ManyToManyField(
        'Member',
        related_name='MandateHistory',
        blank=False
    )

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
        'Application', 
        related_name='reference',
        on_delete=models.CASCADE,
        blank=False,
    )

    name = models.CharField(
        max_length=255, 
        verbose_name=_('Name'),
        blank=False
    )
    
    phone_num = models.CharField(
        max_length=20,
        verbose_name=_('Phone number'),
        blank=True,
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name=_('Title/Role'),
        help_text=_('Enter the title or role of the reference'),
        blank=True
    )

    email = models.EmailField(
        verbose_name=_('Email'),
        help_text=_('Enter the email of the reference'),
        blank=True
    )

    comment = models.CharField(
        max_length=511,
        verbose_name=_('Comment'),
        help_text=_('Enter a comment about the reference'),
        blank=True
    )


class StudyProgram(models.Model): 
    """
    StudyProgram model represents a study program associated with a specific section.
    Attributes:
        section (ForeignKey): A foreign key to the Section model, representing the section to which the study program belongs.
        name_en (CharField): The name of the study program in English.
        name_sv (CharField): The name of the study program in Swedish.
    """

    section = models.ForeignKey(
        'Section',
        related_name='study_programs',
        on_delete=models.CASCADE,
        blank=False,
    )

    name_en = models.CharField(
        max_length=255,
        verbose_name = _('English section name'),
        help_text = _('Enter the name of the section in English'),
        blank=False,
    )

    name_sv = models.CharField(
        max_length=255,
        verbose_name=_("Swedish section name"),
        help_text = _('Enter the name of the section in Swedish'),
    )

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
        verbose_name = _('Abbreviation'),
        help_text = _('Enter the abbreviation of the section'),
        blank=False, 
    )

    section_en = models.CharField(
        max_length=255,
        verbose_name = _('Section name in English'),
        help_text = _('Enter the name of the section in English'),
        blank=False,
    )

    section_sv = models.CharField(
        max_length=255,
        verbose_name = _('Section name in Swedish'),
        help_text = _('Enter the name of the section in Swedish'),
        blank=False,
    )
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
        verbose_name = _('English team name'),
        help_text = _('Enter the name of the team'),
        blank=False,
    )

    name_sv = models.CharField(
        max_length=255,
        verbose_name = _('Swedish team name'),
        help_text = _('Enter the name of the team'),
        blank=False,
    )

    logo = models.ImageField(
        verbose_name=_('Logo'),
        help_text=_('Upload a logo for the team'),
        blank=True,
        upload_to='../media/',
    )

    desc_en = models.TextField(
        verbose_name = _('English team description'),
        help_text = _('Enter a description of the team'),
        blank = True,
    )

    desc_sv = models.TextField(
         verbose_name = _('Swedish team description'),
         help_text = _('Enter a description of the team'),
         blank = True,
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
        rejection_date (DateField): The date when the application was rejected, if applicable.
    """

    position = models.ForeignKey(
        'Position', 
        related_name='applications',
        on_delete=models.CASCADE,
        blank=False,
    )
    
    member = models.ForeignKey(
        'Member',
        on_delete=models.CASCADE,
        blank=False,
    )
    
    STATUS_CHOICES = (
        ('draft', _('Draft')),
        ('submitted', _('Submitted')),
        ('approved', _('Approved')),
        ('disapproved', _('Disapproved')), # TODO Ta bort ?
        ('appointed', _('Appointed')),
        ('turned_down', _('Turned down')),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        verbose_name=_('Status'),
        blank=False,
        null=False,
    )
    
    # ---- Application Information ------
    cover_letter = models.TextField(
        verbose_name=_('Cover Letter'),
        help_text=_("""Present yourself and state why you are
         who we are looking for"""),
    )
    qualifications = models.TextField(
        verbose_name=_('Qualifications'),
        help_text=_('Give a summary of relevant qualifications'),
    )
    gdpr = models.BooleanField(
        default=False,
        verbose_name=('GDPR'),
        help_text=_("""
            I accept that my data is saved in accordance
            with Uppsala Union of Engineering and Science Students integrity
            policy that can be found within the link:
        """),
    )
    
    rejection_date = models.DateField(
        verbose_name=_('Rejection date'),
        null=True,
        blank=True
    )

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
    team = models.ForeignKey(
        'Team',
        related_name='role',
        on_delete=models.CASCADE,
        blank=False,
    )
    
    TYPE_CHOICES = (
        ('admin', _('Admin')),
        ('fum', _('FUM')),
        ('board', _('Board')),
        ('presidium', _('Presidium')),
        ('group_leader', _('Group Leader')),
        ('involved', _('Involved')),
    )
        
    role_type = models.CharField(
        max_length=255,
        choices=TYPE_CHOICES,
        verbose_name=_('Role type'),
        blank=False,
        null=False,
    )

    archived = models.BooleanField(
        verbose_name=_('Archived'),
        help_text=_('Hide the role from menus'),
        default=False,
    )
    
    
    title_en = models.CharField(
        max_length=255,
        verbose_name=_('English role name'),
        help_text=_('Enter the name of the role'),
        blank=False,
    )

    title_sv = models.CharField(
        max_length=255,
        verbose_name=_('Swedish role name'),
        help_text=_('Enter the name of the role'),
        blank=False,
    )


    description_en = models.TextField(
        verbose_name=_('English role description'),
        help_text=_('Enter a description of the role'),
        blank=False,
    )

    description_sv = models.TextField(
        verbose_name=_('Swedish role description'),
        help_text=_('Enter a description of the role'),
        blank=False,
    )

    contact_email = models.EmailField(
        verbose_name=_('Contact email address'),
        help_text=_('The email address for the current position holder'),
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

    