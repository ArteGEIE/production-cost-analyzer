// src/lib/dashboard/compute-dashboard-data.spec.ts
import { describe, expect, it } from "vitest";
import { computeDashboardData } from "./compute-dashboard-data";

const makeProduction = (overrides: Partial<Parameters<typeof computeDashboardData>[0][number]> = {}) => ({
  id: 1,
  producteur: "TestProd",
  titre: "Test Film",
  typeProduction: "Reportage",
  totalDevis: 10000,
  coutMinute: 200,
  confiance: "haute",
  createdAt: "2025-01-15T10:00:00Z",
  dateDevis: "2025-01-01",
  anomalies: [] as unknown,
  verificationMinima: [] as unknown,
  ...overrides,
});

describe("computeDashboardData", () => {
  it("computes totalCount", () => {
    const result = computeDashboardData([makeProduction(), makeProduction({ id: 2 })]);
    expect(result.totalCount).toBe(2);
  });

  it("counts productions with R1 alerts", () => {
    const result = computeDashboardData([
      makeProduction({ anomalies: [{ code: "R1", message: "Below min", severite: "ÉLEVÉE" }] }),
      makeProduction({ id: 2, anomalies: [{ code: "R3", message: "Atypical", severite: "ATTENTION" }] }),
      makeProduction({ id: 3, anomalies: [] }),
    ]);
    expect(result.alertCount).toBe(1);
  });

  it("counts productions with non_conforme in verificationMinima", () => {
    const result = computeDashboardData([
      makeProduction({
        anomalies: [],
        verificationMinima: [
          { poste: "Chef op", tarif_journalier: 200, statut: "non_conforme" },
        ],
      }),
      makeProduction({
        id: 2,
        anomalies: [],
        verificationMinima: [
          { poste: "Monteur", tarif_journalier: 300, statut: "conforme" },
        ],
      }),
    ]);
    expect(result.alertCount).toBe(1);
  });

  it("handles null/non-array anomalies gracefully", () => {
    const result = computeDashboardData([
      makeProduction({ anomalies: null }),
      makeProduction({ id: 2, anomalies: "invalid" }),
    ]);
    expect(result.alertCount).toBe(0);
  });

  it("computes average coutMinute excluding nulls", () => {
    const result = computeDashboardData([
      makeProduction({ coutMinute: 100 }),
      makeProduction({ id: 2, coutMinute: 200 }),
      makeProduction({ id: 3, coutMinute: null }),
    ]);
    expect(result.avgCoutMinute).toBe(150);
  });

  it("returns 0 avgCoutMinute when all are null", () => {
    const result = computeDashboardData([
      makeProduction({ coutMinute: null }),
    ]);
    expect(result.avgCoutMinute).toBe(0);
  });

  it("counts distinct producers", () => {
    const result = computeDashboardData([
      makeProduction({ producteur: "A" }),
      makeProduction({ id: 2, producteur: "B" }),
      makeProduction({ id: 3, producteur: "A" }),
    ]);
    expect(result.producerCount).toBe(2);
  });

  it("computes chart data sorted by avgCoutMinute desc", () => {
    const result = computeDashboardData([
      makeProduction({ producteur: "Cheap", coutMinute: 100 }),
      makeProduction({ id: 2, producteur: "Expensive", coutMinute: 300 }),
      makeProduction({ id: 3, producteur: "Cheap", coutMinute: 200 }),
    ]);
    expect(result.chartData).toHaveLength(2);
    expect(result.chartData[0].name).toBe("Expensive");
    expect(result.chartData[0].avgCoutMinute).toBe(300);
    expect(result.chartData[1].name).toBe("Cheap");
    expect(result.chartData[1].avgCoutMinute).toBe(150);
  });

  it("returns last 10 productions sorted by createdAt desc as recent", () => {
    const prods = Array.from({ length: 15 }, (_, i) =>
      makeProduction({
        id: i + 1,
        titre: `Film ${i + 1}`,
        dateDevis: `2025-01-${String(i + 1).padStart(2, "0")}`,
        createdAt: `2025-06-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
      })
    );
    const result = computeDashboardData(prods);
    expect(result.recent).toHaveLength(10);
    expect(result.recent[0].titre).toBe("Film 15");
  });

  it("sorts by createdAt regardless of dateDevis", () => {
    const prods = [
      makeProduction({ id: 1, titre: "Old devis, recent upload", dateDevis: "2024-01-01", createdAt: "2025-06-01T10:00:00Z" }),
      makeProduction({ id: 2, titre: "Recent devis, old upload", dateDevis: "2025-09-01", createdAt: "2025-01-01T10:00:00Z" }),
    ];
    const result = computeDashboardData(prods);
    expect(result.recent[0].titre).toBe("Old devis, recent upload");
  });
});
