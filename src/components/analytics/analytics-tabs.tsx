"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, Layers, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "jobs", href: "/analytics/jobs", icon: Users },
  { key: "services", href: "/analytics/services", icon: Layers },
  { key: "producers", href: "/analytics/producers", icon: Building2 },
  { key: "compliance", href: "/analytics/compliance", icon: ShieldCheck },
] as const;

export function AnalyticsTabs() {
  const t = useTranslations("analytics.tabs");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  function buildHref(href: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type) params.set("type", type);
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  }

  return (
    <div className="border-b bg-background">
      <div className="flex gap-1 px-4">
        {tabs.map(({ key, href, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);

          return (
            <Link
              key={key}
              href={buildHref(href)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
              )}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
