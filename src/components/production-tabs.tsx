"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FileText, ClipboardCheck, BarChart3, MessageSquareText } from "lucide-react";

interface ProductionTabsProps {
  productionId: string;
}

type TabKey = "devis" | "compliance" | "comparison" | "notes";

interface TabConfig {
  key: TabKey;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProductionTabs({ productionId }: ProductionTabsProps) {
  const t = useTranslations("productionTabs");
  const pathname = usePathname();

  const tabs: TabConfig[] = [
    { key: "devis", icon: FileText },
    { key: "compliance", icon: ClipboardCheck },
    { key: "comparison", icon: BarChart3 },
    { key: "notes", icon: MessageSquareText },
  ];

  return (
    <div className="border-b bg-background">
      <div className="flex gap-1 px-4">
        {tabs.map(({ key, icon: Icon }) => {
          const href = `/productions/${productionId}/${key}`;
          const isActive = pathname?.includes(`/${key}`);

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
