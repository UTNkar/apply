"use client";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";

interface TranslationProviderProps {
  initialLanguage: string;
  children: React.ReactNode;
}

export default function TranslationProvider({ initialLanguage, children }: TranslationProviderProps) {
  // Set language synchronously during initial load to avoid hydration issues
  if (i18n.language !== initialLanguage) {
    i18n.changeLanguage(initialLanguage);
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
