import { describe, expect, it } from "vitest";
import { resolveLocale } from "./resolve-locale";

describe("resolveLocale", () => {
  it("uses a valid cookie value over everything else", () => {
    expect(resolveLocale("de", "fr-FR")).toBe("de");
  });

  it("ignores an invalid cookie value and falls back to Accept-Language", () => {
    expect(resolveLocale("xx", "de-DE,de;q=0.9")).toBe("de");
  });

  it("picks the first supported language from Accept-Language", () => {
    expect(resolveLocale(undefined, "en-US,en;q=0.9,de;q=0.8")).toBe("de");
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(resolveLocale(undefined, "en-US,it;q=0.9")).toBe("fr");
  });

  it("falls back to the default locale when there is no cookie or header", () => {
    expect(resolveLocale(undefined, null)).toBe("fr");
  });

  it("prefers a higher-quality language even if it appears later in the header", () => {
    expect(resolveLocale(undefined, "de;q=0.5,fr;q=0.9")).toBe("fr");
  });

  it("skips a language with quality zero", () => {
    expect(resolveLocale(undefined, "de;q=0,fr;q=1")).toBe("fr");
  });

  it("falls back to the default locale when the only match has quality zero", () => {
    expect(resolveLocale(undefined, "de;q=0")).toBe("fr");
  });
});
