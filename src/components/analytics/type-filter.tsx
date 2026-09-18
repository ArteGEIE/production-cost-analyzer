"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface TypeFilterProps {
  types: string[];
}

export function TypeFilter({ types }: TypeFilterProps) {
  const t = useTranslations("analytics.typeFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("type") ?? "";

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("type", value);
      } else {
        params.delete("type");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  if (types.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-muted-foreground shrink-0">{t("label")}</label>
      <select
        value={current}
        onChange={(e) => update(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label={t("ariaLabel")}
      >
        <option value="">{t("all")}</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}
