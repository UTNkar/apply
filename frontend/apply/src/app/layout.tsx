import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";


export const metadata: Metadata = {
  title: "Apply",
  description: "Application page for engagements in UTN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
     <body >
     <Navbar  />
        {children}
     {/* Footer component här */}
      </body>
    </html>
  );
}
