"use client";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";

interface TranslationProviderProps {
  initialLanguage: string;
  children: React.ReactNode;
}

export default function TranslationProvider({ initialLanguage, children }: TranslationProviderProps) {
  if (i18n.language !== initialLanguage) {
    void i18n.changeLanguage(initialLanguage);
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
