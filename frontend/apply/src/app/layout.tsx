import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "./components/Navbar";
import TranslationProvider from "./i18n/TranslationProvider";


export const metadata: Metadata = {
  title: "Apply",
  description: "Application page for engagements in UTN",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read language preference from cookies
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("language");
  const initialLanguage = langCookie?.value || "en";

  return (
    <html lang={initialLanguage}>
      <body>
        <TranslationProvider initialLanguage={initialLanguage}>
          <Navbar />
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
