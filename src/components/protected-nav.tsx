import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type ProtectedNavProps = {
  email: string;
};

const links = [
  { href: "/app", label: "Voice App" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function ProtectedNav({ email }: ProtectedNavProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-lg font-semibold text-slate-900">
            AI Voice Task Tracker
          </Link>
          <nav className="flex items-center gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
