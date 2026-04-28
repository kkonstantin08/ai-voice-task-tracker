import type { Metadata } from "next";
import "./globals.css";
import { getCurrentLocale } from "@/lib/i18n";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
  const themeInitScript = `(() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = storedTheme === "dark" || (storedTheme !== "light" && systemPrefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {}
  })();`;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
