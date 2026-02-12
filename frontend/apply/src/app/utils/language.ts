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
