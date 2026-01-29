import i18n from '../i18n/config';

/**
 * Get the current locale from i18n
 */
const getLocale = (): string => {
  const language = i18n.language || 'en';
  return language === 'sv' ? 'sv-SE' : 'en-GB';
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
