"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useTranslations("settings.tabs");

  const tabs = [
    { label: t("conventions"), href: "/settings/conventions" },
    { label: t("thresholds"), href: "/settings/thresholds" },
    { label: t("types"), href: "/settings/types" },
    { label: t("producers"), href: "/settings/producers" },
    { label: t("mappings"), href: "/settings/mappings" },
  ];

  return (
    <nav className="flex gap-1 border-b px-4">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px font-medium",
            pathname === tab.href
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
