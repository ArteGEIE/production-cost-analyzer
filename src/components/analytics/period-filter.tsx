"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { MonthPicker } from "@/components/ui/month-picker";

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  return formatMonth(new Date());
}

function prevMonth(): string {
  const d = new Date();
  d.setDate(1); // avoid month overflow (e.g. March 31 → setMonth(1) → March 3)
  d.setMonth(d.getMonth() - 1);
  return formatMonth(d);
}

function janThisYear(): string {
  return `${new Date().getFullYear()}-01`;
}

export function PeriodFilter() {
  const t = useTranslations("analytics.periodFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const hasFilters = from !== "" || to !== "";

  const updateParams = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newFrom && newTo) {
        // Validate: to >= from
        if (newTo < newFrom) newTo = newFrom;
        params.set("from", newFrom);
        params.set("to", newTo);
      } else {
        params.delete("from");
        params.delete("to");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const updateFrom = useCallback(
    (value: string) => {
      const newTo = to && to < value ? value : to || value;
      updateParams(value, newTo);
    },
    [to, updateParams],
  );

  const updateTo = useCallback(
    (value: string) => {
      const newFrom = from && from > value ? value : from || value;
      updateParams(newFrom, value);
    },
    [from, updateParams],
  );

  const reset = useCallback(() => {
    updateParams("", "");
  }, [updateParams]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{t("label")}</span>
      <MonthPicker value={from} onChange={updateFrom} placeholder={t("from")} />
      <span className="text-muted-foreground">→</span>
      <MonthPicker value={to} onChange={updateTo} placeholder={t("to")} />

      {/* Presets */}
      <div className="flex items-center gap-1 ml-1">
        <PresetButton
          label={t("thisMonth")}
          onClick={() => updateParams(currentMonth(), currentMonth())}
          active={from === currentMonth() && to === currentMonth()}
        />
        <PresetButton
          label={t("lastMonth")}
          onClick={() => updateParams(prevMonth(), prevMonth())}
          active={from === prevMonth() && to === prevMonth()}
        />
        <PresetButton
          label={t("thisYear")}
          onClick={() => updateParams(janThisYear(), currentMonth())}
          active={from === janThisYear() && to === currentMonth()}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline ml-1"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}

function PresetButton({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "border bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
