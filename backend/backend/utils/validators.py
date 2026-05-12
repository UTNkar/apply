from django.core import validators
from django.utils.translation import gettext_lazy as _


# Taken from moore
class SSNValidator(validators.RegexValidator):
    century = r"19|20"  # YY-- Only allows 19-- and 20--
    decade = r"[0-9]{2}"  # --YY
    month = r"[0-1][0-9]"
    day = r"[0-3][0-9]"
    last_four = r"(T|t|[0-9])[0-9]{3}"  # Allows T-number SSN

    def __init__(self):
        regex_pattern = (
            r"^("
            + self.century
            + r")?"
            + self.decade
            + self.month
            + self.day
            + r"(-|\+)?"
            + self.last_four
            + r"$"
        )

        super(SSNValidator, self).__init__(
            regex=regex_pattern,
            message=_(
                "Use the format YYYYMMDD-XXXX, YYMMDD-XXXX, "
                "YYYYMMDDXXXX, YYMMDDXXXX for your ssn."
            ),
        )


class NumberValidator:
    def validate(self, password, user=None):
        if not any(char.isdigit() for char in password):
            raise validators.ValidationError(
                _("This password must contain at least one number."),
                code="password_no_number",
            )

    def get_help_text(self):
        return _("Your password must contain at least one number.")


class SpecialCharacterValidator:
    SPECIAL_CHARACTERS = r"!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~"

    def validate(self, password, user=None):
        if not any(char in self.SPECIAL_CHARACTERS for char in password):
            raise validators.ValidationError(
                _("This password must contain at least one special character."),
                code="password_no_special_character",
            )

    def get_help_text(self):
        return _("Your password must contain at least one special character.")
