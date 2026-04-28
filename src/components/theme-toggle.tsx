"use client";

type ThemeToggleProps = {
  size?: "default" | "compact";
  className?: string;
};

export function ThemeToggle({ size = "default", className }: ThemeToggleProps) {
  const compact = size === "compact";

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={[
        "inline-flex items-center rounded-full border border-slate-300 bg-white font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        compact ? "h-6 px-2 text-[11px]" : "h-8 px-3 text-xs",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      🌓
    </button>
  );
}
