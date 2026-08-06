import i18n from '../i18n/config';

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const urgentDeadlineHours = 48;
const soonDeadlineDays = 5;

/**
 * Get the current locale from i18n
 */
const getLocale = (): string => {
  const language = i18n.language || 'en';
  return language === 'sv' ? 'sv-SE' : 'en-GB';
};

/**
 * Parse a deadline string. Date-only deadlines are treated as the end of that
 * local calendar day, since they represent the last day to apply.
 */
export const parseDeadlineDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  const dateOnlyMatch = dateOnlyPattern.exec(dateString);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      23,
      59,
      59,
      999,
    );
  }

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

export const getDeadlineUrgency = (
  dateString: string,
): "default" | "soon" | "urgent" => {
  const deadline = parseDeadlineDate(dateString);
  if (!deadline) return "default";

  const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursRemaining < urgentDeadlineHours) {
    return "urgent";
  }

  if (hoursRemaining <= soonDeadlineDays * 24) {
    return "soon";
  }

  return "default";
};

/**
 * Format a date string to a human-readable format based on the current i18n locale
 * @param dateString - ISO date string ("2026-09-01")
 * @param options - Intl.DateTimeFormat options
 */
export const formatDate = (
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    };

    const locale = getLocale();
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Format a date to show only month and year
 * @param dateString - ISO date string
 */
export const formatMonthYear = (dateString: string): string => {
  return formatDate(dateString, { year: "numeric", month: "long" });
};

/**
 * Format a date range to human-readable format
 * @param startDate - ISO date string for start
 * @param endDate - ISO date string for end
 */
export const formatDateRange = (
  startDate: string,
  endDate: string,
): string => {
  const start = formatMonthYear(startDate);
  const end = formatMonthYear(endDate);
  return `${start} - ${end}`;
};
