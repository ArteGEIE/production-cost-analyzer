import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/queries", () => ({
  getAllProductionsFull: vi.fn(),
}));

vi.mock("../db/queries-settings", async () => {
  const config = await import("../config/structural-thresholds");
  return {
    getThresholdConfig: vi.fn().mockResolvedValue({
      structural: config.DEFAULT_STRUCTURAL_THRESHOLDS,
      r6MinRate: config.DEFAULT_R6_MIN_RATE,
      r7MaxDeviation: config.DEFAULT_R7_MAX_DEVIATION,
    }),
  };
});

import { getAllProductionsFull } from "../db/queries";
import {
  getJobSummary,
  getJobDetail,
  getCategorySummary,
  getCategoryDetail,
  getProducerSummary,
  getProducerDetail,
  filterByPeriod,
  computeTrend,
} from "./queries-analytics";

const mockGetAll = vi.mocked(getAllProductionsFull);

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface ProductionOverrides {
  [key: string]: unknown;
}

const makeProduction = (overrides: ProductionOverrides = {}) => ({
  id: 1,
  producteur: "Studio Alpha",
  titre: "Test Production",
  typeProduction: "Reportage" as string | null,
  totalDevis: 50000,
  coutMinute: 2000,
  confiance: "haute" as string | null,
  createdAt: "2024-06-15T00:00:00.000Z",
  formatSource: "seed-history",
  grilleCnc: {
    "1_droits_artistiques": { lignes: [], total: 2000 },
    "2_personnel": {
      postes: [
        {
          poste: "Chef opérateur",
          role_key: "cadreur_opv",
          tarif_journalier: 300,
          nombre_jours: 5,
          total: 1500,
        },
        {
          poste: "Ingénieur du son",
          role_key: "chef_ops_ingenieur_du_son",
          tarif_journalier: 350,
          nombre_jours: 5,
          total: 1750,
        },
      ],
      total: 3250,
    },
    "4_charges_sociales": { lignes: [], total: 5000 },
    "6_transport": { lignes: [], total: 3000 },
    "7_tournage": {
      lignes: [
        { poste: "Caméra", montant: 4000, sous_categorie: "camera" },
      ],
      total: 4000,
    },
    "8_post_production": {
      lignes: [
        { poste: "Montage", montant: 3000, sous_categorie: "montage" },
      ],
      total: 3000,
    },
    "9_assurance": { lignes: [], total: 1000 },
    "10_imprevus_fg_pd": { lignes: [], total: 5000 },
  },
  verificationMinima: [
    {
      poste: "Chef opérateur",
      tarif_journalier: 300,
      minimum_cc: 281.54,
      ecart_pourcent: 6.6,
      statut: "conforme" as const,
    },
  ],
  ...overrides,
});

beforeEach(() => {
  mockGetAll.mockReset();
});

// ---------------------------------------------------------------------------
// filterByPeriod
// ---------------------------------------------------------------------------
describe("filterByPeriod", () => {
  const items = [
    makeProduction({ id: 1, createdAt: "2024-01-15T00:00:00.000Z" }),
    makeProduction({ id: 2, createdAt: "2024-06-15T00:00:00.000Z" }),
    makeProduction({ id: 3, createdAt: "2024-12-15T00:00:00.000Z" }),
  ];

  it("returns all items when no period is given", () => {
    expect(filterByPeriod(items)).toHaveLength(3);
  });

  it("filters items within the period", () => {
    const period = {
      from: new Date("2024-03-01"),
      to: new Date("2024-09-01"),
    };
    const result = filterByPeriod(items, period);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns empty array when no items match", () => {
    const period = {
      from: new Date("2025-01-01"),
      to: new Date("2025-12-31"),
    };
    expect(filterByPeriod(items, period)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeTrend
// ---------------------------------------------------------------------------
describe("computeTrend", () => {
  it('returns "stable" for empty list', () => {
    expect(computeTrend([])).toBe("stable");
  });

  it('returns "stable" for single item', () => {
    expect(computeTrend([makeProduction()])).toBe("stable");
  });

  it('returns "up" when second half avg is >10% higher', () => {
    const prods = [
      makeProduction({ coutMinute: 1000, createdAt: "2024-01-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1000, createdAt: "2024-02-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1500, createdAt: "2024-06-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1500, createdAt: "2024-07-01T00:00:00Z" }),
    ];
    expect(computeTrend(prods)).toBe("up");
  });

  it('returns "down" when second half avg is >10% lower', () => {
    const prods = [
      makeProduction({ coutMinute: 1500, createdAt: "2024-01-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1500, createdAt: "2024-02-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1000, createdAt: "2024-06-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1000, createdAt: "2024-07-01T00:00:00Z" }),
    ];
    expect(computeTrend(prods)).toBe("down");
  });

  it('returns "stable" when change is <=10%', () => {
    const prods = [
      makeProduction({ coutMinute: 1000, createdAt: "2024-01-01T00:00:00Z" }),
      makeProduction({ coutMinute: 1050, createdAt: "2024-06-01T00:00:00Z" }),
    ];
    expect(computeTrend(prods)).toBe("stable");
  });
});

// ---------------------------------------------------------------------------
// getJobSummary
// ---------------------------------------------------------------------------
describe("getJobSummary", () => {
  it("returns empty array when no productions", async () => {
    mockGetAll.mockResolvedValue([]);
    const result = await getJobSummary();
    expect(result).toEqual([]);
  });

  it("aggregates job roles across productions", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        grilleCnc: {
          ...makeProduction().grilleCnc,
          "2_personnel": {
            postes: [
              {
                poste: "Chef opérateur",
                role_key: "cadreur_opv",
                tarif_journalier: 300,
                nombre_jours: 5,
                total: 1500,
              },
            ],
            total: 1500,
          },
        },
      }),
      makeProduction({
        id: 2,
        grilleCnc: {
          ...makeProduction().grilleCnc,
          "2_personnel": {
            postes: [
              {
                poste: "Chef opérateur",
                role_key: "cadreur_opv",
                tarif_journalier: 400,
                nombre_jours: 3,
                total: 1200,
              },
            ],
            total: 1200,
          },
        },
      }),
    ]);

    const result = await getJobSummary();
    const chefOp = result.find((r) => r.roleKey === "cadreur_opv");
    expect(chefOp).toBeDefined();
    expect(chefOp!.occurrences).toBe(2);
    expect(chefOp!.avgRate).toBe(350);
    expect(chefOp!.minRate).toBe(300);
    expect(chefOp!.maxRate).toBe(400);
    expect(chefOp!.ccMinimum).toBe(281.54);
  });

  it("sets ccMinimum to null for unknown roles", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        grilleCnc: {
          ...makeProduction().grilleCnc,
          "2_personnel": {
            postes: [
              {
                poste: "Producteur",
                role_key: "producteur",
                tarif_journalier: 500,
                nombre_jours: 2,
                total: 1000,
              },
            ],
            total: 1000,
          },
        },
      }),
    ]);

    const result = await getJobSummary();
    const prod = result.find((r) => r.roleKey === "producteur");
    expect(prod).toBeDefined();
    expect(prod!.ccMinimum).toBeNull();
  });

  it("sorts by occurrences descending", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({ id: 1 }),
      makeProduction({ id: 2 }),
    ]);
    const result = await getJobSummary();
    // Both roles appear 2 times each (from makeProduction default),
    // just verify result is sorted
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].occurrences).toBeGreaterThanOrEqual(
        result[i].occurrences,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// getJobDetail
// ---------------------------------------------------------------------------
describe("getJobDetail", () => {
  it("returns null for unknown role key", async () => {
    mockGetAll.mockResolvedValue([makeProduction()]);
    const result = await getJobDetail("unknown_role");
    expect(result).toBeNull();
  });

  it("returns detail for a known role", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        titre: "Prod A",
        producteur: "Studio Alpha",
        createdAt: "2024-06-01T00:00:00Z",
      }),
      makeProduction({
        id: 2,
        titre: "Prod B",
        producteur: "Carrousel",
        createdAt: "2024-07-01T00:00:00Z",
        grilleCnc: {
          ...makeProduction().grilleCnc,
          "2_personnel": {
            postes: [
              {
                poste: "Chef opérateur",
                role_key: "cadreur_opv",
                tarif_journalier: 400,
                nombre_jours: 3,
                total: 1200,
              },
            ],
            total: 1200,
          },
        },
      }),
    ]);

    const result = await getJobDetail("cadreur_opv");
    expect(result).not.toBeNull();
    expect(result!.roleKey).toBe("cadreur_opv");
    expect(result!.ccMinimum).toBe(281.54);
    expect(result!.globalAvgRate).toBe(350);
    expect(result!.occurrences).toHaveLength(2);
    expect(result!.occurrences[0].productionId).toBe(1);
    expect(result!.occurrences[1].productionId).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getCategorySummary
// ---------------------------------------------------------------------------
describe("getCategorySummary", () => {
  it("returns empty array when no productions", async () => {
    mockGetAll.mockResolvedValue([]);
    const result = await getCategorySummary();
    expect(result).toEqual([]);
  });

  it("computes average amounts and percentages for each category", async () => {
    mockGetAll.mockResolvedValue([makeProduction({ totalDevis: 50000 })]);

    const result = await getCategorySummary();
    expect(result.length).toBeGreaterThan(0);

    const personnel = result.find((r) => r.categoryKey === "2_personnel");
    expect(personnel).toBeDefined();
    expect(personnel!.avgAmount).toBe(3250);
    expect(personnel!.avgPct).toBeCloseTo(3250 / 50000, 4);
  });

  it("includes structural thresholds when available", async () => {
    mockGetAll.mockResolvedValue([makeProduction()]);
    const result = await getCategorySummary();

    const personnel = result.find((r) => r.categoryKey === "2_personnel");
    expect(personnel!.thresholdLow).toBe(0.15);
    expect(personnel!.thresholdHigh).toBe(0.55);

    // Category without thresholds
    const assurance = result.find((r) => r.categoryKey === "9_assurance");
    expect(assurance!.thresholdLow).toBeNull();
    expect(assurance!.thresholdHigh).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCategoryDetail
// ---------------------------------------------------------------------------
describe("getCategoryDetail", () => {
  it("returns null for unknown category", async () => {
    mockGetAll.mockResolvedValue([makeProduction()]);
    const result = await getCategoryDetail("99_unknown");
    expect(result).toBeNull();
  });

  it("returns detail with producer breakdown", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({ id: 1, producteur: "Studio Alpha" }),
      makeProduction({ id: 2, producteur: "Studio Alpha" }),
      makeProduction({ id: 3, producteur: "Carrousel" }),
    ]);

    const result = await getCategoryDetail("2_personnel");
    expect(result).not.toBeNull();
    expect(result!.productionCount).toBe(3);
    expect(result!.producerBreakdown).toHaveLength(2);

    const alpha = result!.producerBreakdown.find(
      (p) => p.producteur === "Studio Alpha",
    );
    expect(alpha!.count).toBe(2);
  });

  it("includes sub-categories from lignes", async () => {
    mockGetAll.mockResolvedValue([makeProduction()]);
    const result = await getCategoryDetail("7_tournage");
    expect(result).not.toBeNull();
    expect(result!.subCategories.length).toBeGreaterThan(0);
    expect(result!.subCategories[0].name).toBe("camera");
  });

  it("lists all productions with amounts", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({ id: 1, titre: "Prod A", totalDevis: 50000 }),
    ]);
    const result = await getCategoryDetail("2_personnel");
    expect(result!.productions).toHaveLength(1);
    expect(result!.productions[0].amount).toBe(3250);
    expect(result!.productions[0].pct).toBeCloseTo(3250 / 50000, 4);
  });
});

// ---------------------------------------------------------------------------
// getProducerSummary
// ---------------------------------------------------------------------------
describe("getProducerSummary", () => {
  it("returns empty array when no productions", async () => {
    mockGetAll.mockResolvedValue([]);
    const result = await getProducerSummary();
    expect(result).toEqual([]);
  });

  it("groups by producer and computes avg cost/minute", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        producteur: "Studio Alpha",
        coutMinute: 2000,
        createdAt: "2024-01-01T00:00:00Z",
      }),
      makeProduction({
        id: 2,
        producteur: "Studio Alpha",
        coutMinute: 3000,
        createdAt: "2024-06-01T00:00:00Z",
      }),
      makeProduction({
        id: 3,
        producteur: "Carrousel",
        coutMinute: 1500,
        createdAt: "2024-03-01T00:00:00Z",
      }),
    ]);

    const result = await getProducerSummary();
    expect(result).toHaveLength(2);

    const alpha = result.find((r) => r.producteur === "Studio Alpha");
    expect(alpha!.productionCount).toBe(2);
    expect(alpha!.avgCoutMinute).toBe(2500);
  });

  it("counts CC alerts (non_conforme only)", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        verificationMinima: [
          {
            poste: "Chef opérateur",
            tarif_journalier: 250,
            minimum_cc: 281.54,
            ecart_pourcent: -11.2,
            statut: "non_conforme",
          },
          {
            poste: "Ingénieur du son",
            tarif_journalier: 340,
            minimum_cc: 337.39,
            ecart_pourcent: 0.8,
            statut: "conforme",
          },
          {
            poste: "Producteur",
            tarif_journalier: 500,
            minimum_cc: null,
            ecart_pourcent: null,
            statut: "hors_nomenclature",
          },
        ],
      }),
    ]);

    const result = await getProducerSummary();
    expect(result[0].ccAlertCount).toBe(1);
  });

  it("sorts by production count descending", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({ id: 1, producteur: "Small" }),
      makeProduction({ id: 2, producteur: "Big" }),
      makeProduction({ id: 3, producteur: "Big" }),
      makeProduction({ id: 4, producteur: "Big" }),
    ]);

    const result = await getProducerSummary();
    expect(result[0].producteur).toBe("Big");
    expect(result[0].productionCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getProducerDetail
// ---------------------------------------------------------------------------
describe("getProducerDetail", () => {
  it("returns null for unknown producer", async () => {
    mockGetAll.mockResolvedValue([makeProduction({ producteur: "Studio Alpha" })]);
    const result = await getProducerDetail("Unknown");
    expect(result).toBeNull();
  });

  it("returns full producer profile", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        producteur: "Studio Alpha",
        totalDevis: 50000,
        coutMinute: 2000,
        createdAt: "2024-01-01T00:00:00Z",
      }),
      makeProduction({
        id: 2,
        producteur: "Studio Alpha",
        totalDevis: 60000,
        coutMinute: 2500,
        createdAt: "2024-06-01T00:00:00Z",
      }),
      makeProduction({
        id: 3,
        producteur: "Carrousel",
        totalDevis: 40000,
        coutMinute: 1500,
        createdAt: "2024-03-01T00:00:00Z",
      }),
    ]);

    const result = await getProducerDetail("Studio Alpha");
    expect(result).not.toBeNull();
    expect(result!.producteur).toBe("Studio Alpha");
    expect(result!.productionCount).toBe(2);
    expect(result!.avgCoutMinute).toBe(2250);
    expect(result!.dateRange.first).toBe("2024-01-01T00:00:00Z");
    expect(result!.dateRange.last).toBe("2024-06-01T00:00:00Z");
  });

  it("computes avg CNC structure for producer and global", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        producteur: "Studio Alpha",
        totalDevis: 50000,
      }),
      makeProduction({
        id: 2,
        producteur: "Carrousel",
        totalDevis: 50000,
      }),
    ]);

    const result = await getProducerDetail("Studio Alpha");
    expect(result!.avgStructure).toBeDefined();
    expect(result!.globalAvgStructure).toBeDefined();
    // Personnel is 3250 / 50000 = 0.065
    expect(result!.avgStructure["2_personnel"]).toBeCloseTo(3250 / 50000, 4);
  });

  it("groups CC alerts by rule and role", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        producteur: "Studio Alpha",
        verificationMinima: [
          {
            poste: "Chef opérateur",
            tarif_journalier: 250,
            minimum_cc: 281.54,
            ecart_pourcent: -11.2,
            statut: "non_conforme",
          },
        ],
      }),
      makeProduction({
        id: 2,
        producteur: "Studio Alpha",
        verificationMinima: [
          {
            poste: "Chef opérateur",
            tarif_journalier: 260,
            minimum_cc: 281.54,
            ecart_pourcent: -7.6,
            statut: "non_conforme",
          },
        ],
      }),
    ]);

    const result = await getProducerDetail("Studio Alpha");
    expect(result!.ccAlerts).toHaveLength(1);
    expect(result!.ccAlerts[0].count).toBe(2);
    expect(result!.ccAlerts[0].total).toBe(2);
  });

  it("includes production list and history", async () => {
    mockGetAll.mockResolvedValue([
      makeProduction({
        id: 1,
        producteur: "Studio Alpha",
        titre: "Prod A",
        totalDevis: 50000,
        coutMinute: 2000,
        createdAt: "2024-01-01T00:00:00Z",
      }),
    ]);

    const result = await getProducerDetail("Studio Alpha");
    expect(result!.productions).toHaveLength(1);
    expect(result!.productions[0].titre).toBe("Prod A");
    expect(result!.history).toHaveLength(1);
    expect(result!.history[0].coutMinute).toBe(2000);
  });
});
