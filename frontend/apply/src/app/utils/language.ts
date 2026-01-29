/**
 * Get the language preference from cookie
 * @returns The language code ('sv' or 'en') or null if not set
 */
export const getLanguageFromCookie = (): string | null => {
  // Don't attempt to read cookies during server-side rendering
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const langCookie = cookies.find((cookie) => cookie.startsWith("language="));
  return langCookie ? langCookie.split("=")[1] : null;
};

/**
 * Save the language preference to cookie
 * @param language - The language code to save ('sv' or 'en')
 */
export const setLanguageCookie = (language: string): void => {
  if (typeof document === "undefined") return;

  // Set cookie to expire in 3 years
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 3);
  document.cookie = `language=${language}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};
