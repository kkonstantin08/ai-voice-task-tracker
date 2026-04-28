"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  label: string;
  loadingLabel: string;
  className?: string;
};

export function LogoutButton({ label, loadingLabel, className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className={className}
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}
