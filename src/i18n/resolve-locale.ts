import { defaultLocale, isLocale, type Locale } from "./routing";

export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (cookieValue && isLocale(cookieValue)) {
    return cookieValue;
  }

  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(",")
      .map((tag) => {
        const [langPart, ...params] = tag.trim().split(";");
        const qParam = params.find((p) => p.trim().startsWith("q="));
        const quality = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
        const lang = langPart!.split("-")[0]!.toLowerCase();
        return { lang, quality: Number.isNaN(quality) ? 0 : quality };
      })
      .filter((candidate) => candidate.quality > 0)
      .sort((a, b) => b.quality - a.quality);

    for (const { lang } of candidates) {
      if (isLocale(lang)) {
        return lang;
      }
    }
  }

  return defaultLocale;
}
