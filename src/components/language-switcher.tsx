"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();

  function handleChange(next: Locale) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      aria-label={t("language")}
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      className="rounded-md border bg-background px-2 py-1 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
