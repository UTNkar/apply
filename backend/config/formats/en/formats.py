"""Overrides for the English (en) locale formats."""

# django/conf/locale/en/formats.py hardcodes FIRST_DAY_OF_WEEK = 0 (Sunday), and
# locale formats take precedence over the FIRST_DAY_OF_WEEK setting. Providing
# the value here is therefore the only way to change it while staying on the
# en-us locale.
FIRST_DAY_OF_WEEK = 1
