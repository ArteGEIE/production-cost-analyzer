"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  authenticated: ReactNode;
}

export function AuthShell({ children, authenticated }: AuthShellProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("authShell");
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/sign-in") {
      router.replace("/sign-in");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </div>
    );
  }

  // Sign-in page always renders bare (no header/nav)
  if (pathname === "/sign-in") {
    return <>{children}</>;
  }

  if (status === "authenticated") {
    return <>{authenticated}</>;
  }

  // Redirecting — show nothing
  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
    </div>
  );
}
