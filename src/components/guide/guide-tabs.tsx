"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { List, Cpu, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "features", href: "/guide/features", icon: List },
  { key: "howItWorks", href: "/guide/how-it-works", icon: Cpu },
  { key: "faq", href: "/guide/faq", icon: HelpCircle },
] as const;

export function GuideTabs() {
  const t = useTranslations("guide.tabs");
  const pathname = usePathname();

  return (
    <div className="border-b bg-background">
      <div className="flex gap-1 px-4">
        {tabs.map(({ key, href, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);

          return (
            <Link
              key={key}
              href={href}
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
