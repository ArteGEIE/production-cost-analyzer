"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CcRatesTable } from "./cc-rates-table";

function formatDateFr(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface HistoryPeriod {
  effectiveFrom: string;
  rates: { roleKey: string; label: string; filiere: string | null; niveau: string | null; minimumDaily: number }[];
}

export function CcHistoryPanel({ periods }: { periods: HistoryPeriod[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const t = useTranslations("settings.conventions");

  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noHistory")}</p>;
  }

  return (
    <div className="space-y-2">
      {periods.map((period) => {
        const isOpen = expanded === period.effectiveFrom;
        return (
          <div key={period.effectiveFrom} className="border rounded-lg">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : period.effectiveFrom)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors rounded-lg"
            >
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              {t("historyEntry", { date: formatDateFr(period.effectiveFrom) })}
              <span className="text-muted-foreground font-normal ml-1">
                {t("postsCount", { count: period.rates.length })}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                <CcRatesTable rates={period.rates} effectiveFrom={period.effectiveFrom} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
