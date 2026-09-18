// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import { SummaryCard } from "@/components/compliance/summary-card";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("message catalogs", () => {
  it("fr.json and de.json expose the same set of keys", () => {
    const frKeys = flattenKeys(fr).sort();
    const deKeys = flattenKeys(de).sort();

    expect(deKeys).toEqual(frKeys);
  });

  it("renders a component in German via NextIntlClientProvider", () => {
    render(
      <NextIntlClientProvider locale="de" messages={de}>
        <SummaryCard anomalies={[]} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Konformitätsübersicht")).toBeTruthy();
    expect(screen.getByText("Keine Verstöße")).toBeTruthy();
    expect(screen.getByText("Keine kritischen Verstöße")).toBeTruthy();
  });
});
