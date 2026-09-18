"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const t = useTranslations("userMenu");
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session?.user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={session.user.name ?? t("user")}
      >
        {getInitials(session.user.name) || <User className="size-4" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-lg">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            {session.user.email && (
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            )}
          </div>
          <div className="border-t" />
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/sign-in" })}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
