import type { Metadata } from "next";
import "./globals.css";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AI Voice Task Tracker",
  description:
    "Record voice notes, transcribe with Mistral, extract structured tasks, and track productivity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
