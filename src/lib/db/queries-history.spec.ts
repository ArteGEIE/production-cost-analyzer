import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createTestDb } from "./test-db";
import { insertProduction } from "./queries";
import {
  getProductionsByProducteur,
  getProductionStats,
  getGlobalStats,
  getProducerRanking,
  getComparisonFilterOptions,
} from "./queries-history";
import type { DevisExtraction } from "@/lib/schemas/devis";

const { db: testDb } = await createTestDb();

// Helper to create a DevisExtraction with specific values
function makeExtraction(overrides: {
  producteur?: string;
  titre?: string;
  typeProduction?: string;
  totalDevis?: number;
  coutMinute?: number;
  dureeMinutes?: number;
  grilleCnc?: DevisExtraction["grille_cnc"];
}): DevisExtraction {
  const defaultGrille: DevisExtraction["grille_cnc"] = {
    "1_droits_artistiques": { lignes: [], total: 0 },
    "2_personnel": { postes: [], total: 0 },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": { lignes: [], total: 0 },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": { lignes: [], total: 0 },
    "7_tournage": { lignes: [], total: 0 },
    "8_post_production": { lignes: [], total: 0 },
    "9_assurance": { lignes: [], total: 0 },
    "10_imprevus_fg_pd": { lignes: [], total: 0 },
  };

  return {
    meta: {
      producteur: overrides.producteur ?? "TestProd",
      titre: overrides.titre ?? "Test Film",
      duree_minutes: overrides.dureeMinutes ?? 52,
      type_production: overrides.typeProduction ?? "Documentaire 52min",
      diffuseur: "ARTE",
      lieu_tournage: "Paris",
      format_source: "PDF",
    },
    grille_cnc: overrides.grilleCnc ?? defaultGrille,
    total_devis: overrides.totalDevis ?? 10000,
    cout_minute: overrides.coutMinute ?? 192.3,
    verification_minima: [],
    anomalies: [],
    postes_non_classes: [],
    confiance: "haute",
  };
}

afterEach(async () => {
  await testDb.execute(sql`DELETE FROM productions`);
});

describe("getProductionsByProducteur", () => {
  it("returns productions for a specific producer sorted by date desc", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", titre: "Film 1" }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdA", titre: "Film 2" }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdB", titre: "Film 3" }), { db: testDb });

    const rows = await getProductionsByProducteur("ProdA", testDb);
    expect(rows).toHaveLength(2);
    expect(rows[0].titre).toBe("Film 2"); // most recent
    expect(rows[1].titre).toBe("Film 1");
  });

  it("returns empty array for unknown producer", async () => {
    const rows = await getProductionsByProducteur("Unknown", testDb);
    expect(rows).toHaveLength(0);
  });
});

describe("getProductionStats", () => {
  it("computes average cost/minute and count for a producer", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 200, totalDevis: 10000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdB", coutMinute: 300, totalDevis: 15000 }), { db: testDb });

    const stats = await getProductionStats("ProdA", undefined, {}, testDb);
    expect(stats.count).toBe(2);
    expect(stats.avgCoutMinute).toBe(150);
  });

  it("computes average CNC structure as percentages", async () => {
    const grille1: DevisExtraction["grille_cnc"] = {
      "1_droits_artistiques": { lignes: [], total: 1000 },
      "2_personnel": { postes: [], total: 4000 },
      "3_interpretation": { lignes: [], total: 0 },
      "4_charges_sociales": { lignes: [], total: 2000 },
      "5_decors_costumes": { lignes: [], total: 0 },
      "6_transport": { lignes: [], total: 1000 },
      "7_tournage": { lignes: [], total: 1000 },
      "8_post_production": { lignes: [], total: 500 },
      "9_assurance": { lignes: [], total: 200 },
      "10_imprevus_fg_pd": { lignes: [], total: 300 },
    };
    // total = 10000, so 1_droits = 10%, 2_personnel = 40%

    const grille2: DevisExtraction["grille_cnc"] = {
      "1_droits_artistiques": { lignes: [], total: 4000 },
      "2_personnel": { postes: [], total: 8000 },
      "3_interpretation": { lignes: [], total: 0 },
      "4_charges_sociales": { lignes: [], total: 4000 },
      "5_decors_costumes": { lignes: [], total: 0 },
      "6_transport": { lignes: [], total: 2000 },
      "7_tournage": { lignes: [], total: 2000 },
      "8_post_production": { lignes: [], total: 0 },
      "9_assurance": { lignes: [], total: 0 },
      "10_imprevus_fg_pd": { lignes: [], total: 0 },
    };
    // total = 20000, so 1_droits = 20%, 2_personnel = 40%

    await insertProduction(
      makeExtraction({ producteur: "ProdA", totalDevis: 10000, coutMinute: 100, grilleCnc: grille1 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdA", totalDevis: 20000, coutMinute: 200, grilleCnc: grille2 }),
      { db: testDb },
    );

    const stats = await getProductionStats("ProdA", undefined, {}, testDb);
    // 1_droits: avg of 10% and 20% = 15%
    expect(stats.avgStructure["1_droits_artistiques"]).toBeCloseTo(0.15);
    // 2_personnel: avg of 40% and 40% = 40%
    expect(stats.avgStructure["2_personnel"]).toBeCloseTo(0.4);
  });

  it("filters by typeProduction", async () => {
    await insertProduction(
      makeExtraction({ producteur: "ProdA", typeProduction: "Documentaire 52min", coutMinute: 100, totalDevis: 5000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdA", typeProduction: "Reportage", coutMinute: 300, totalDevis: 15000 }),
      { db: testDb },
    );

    const stats = await getProductionStats("ProdA", "Documentaire 52min", {}, testDb);
    expect(stats.count).toBe(1);
    expect(stats.avgCoutMinute).toBe(100);
  });

  it("returns zeros when no data", async () => {
    const stats = await getProductionStats("NonExistent", undefined, {}, testDb);
    expect(stats.count).toBe(0);
    expect(stats.avgCoutMinute).toBe(0);
    expect(stats.avgStructure["1_droits_artistiques"]).toBe(0);
  });
});

describe("getGlobalStats", () => {
  it("computes stats across all producers", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdB", coutMinute: 200, totalDevis: 10000 }), { db: testDb });

    const stats = await getGlobalStats(undefined, {}, testDb);
    expect(stats.count).toBe(2);
    expect(stats.avgCoutMinute).toBe(150);
  });

  it("filters by type", async () => {
    await insertProduction(
      makeExtraction({ producteur: "ProdA", typeProduction: "Documentaire 52min", coutMinute: 100, totalDevis: 5000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdB", typeProduction: "Reportage", coutMinute: 300, totalDevis: 15000 }),
      { db: testDb },
    );

    const stats = await getGlobalStats("Reportage", {}, testDb);
    expect(stats.count).toBe(1);
    expect(stats.avgCoutMinute).toBe(300);
  });

  it("returns zeros when no data", async () => {
    const stats = await getGlobalStats(undefined, {}, testDb);
    expect(stats.count).toBe(0);
    expect(stats.avgCoutMinute).toBe(0);
  });
});

describe("getProducerRanking", () => {
  it("ranks producers by avg cost/minute ascending", async () => {
    await insertProduction(makeExtraction({ producteur: "Expensive", coutMinute: 500, totalDevis: 25000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "Cheap", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "Middle", coutMinute: 200, totalDevis: 10000 }), { db: testDb });

    const ranking = await getProducerRanking(undefined, {}, testDb);
    expect(ranking).toHaveLength(3);
    expect(ranking[0].producteur).toBe("Cheap");
    expect(ranking[0].avgCoutMinute).toBe(100);
    expect(ranking[1].producteur).toBe("Middle");
    expect(ranking[2].producteur).toBe("Expensive");
  });

  it("averages multiple productions per producer", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 200, totalDevis: 10000 }), { db: testDb });

    const ranking = await getProducerRanking(undefined, {}, testDb);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].avgCoutMinute).toBe(150);
    expect(ranking[0].count).toBe(2);
  });

  it("filters by typeProduction", async () => {
    await insertProduction(
      makeExtraction({ producteur: "ProdA", typeProduction: "Documentaire 52min", coutMinute: 100, totalDevis: 5000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdB", typeProduction: "Reportage", coutMinute: 300, totalDevis: 15000 }),
      { db: testDb },
    );

    const ranking = await getProducerRanking("Reportage", {}, testDb);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].producteur).toBe("ProdB");
  });

  it("returns empty array when no data", async () => {
    const ranking = await getProducerRanking(undefined, {}, testDb);
    expect(ranking).toHaveLength(0);
  });
});

describe("comparison filters", () => {
  it("getProductionStats honors dureeMinutes filter", async () => {
    await insertProduction(
      makeExtraction({ producteur: "ProdA", dureeMinutes: 24, coutMinute: 100, totalDevis: 5000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdA", dureeMinutes: 52, coutMinute: 300, totalDevis: 15000 }),
      { db: testDb },
    );

    const stats = await getProductionStats("ProdA", undefined, { dureeMinutes: 24 }, testDb);
    expect(stats.count).toBe(1);
    expect(stats.avgCoutMinute).toBe(100);
  });

  it("getGlobalStats honors a producteurs subset filter", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdB", coutMinute: 200, totalDevis: 10000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdC", coutMinute: 300, totalDevis: 15000 }), { db: testDb });

    // Peer set = ProdA + ProdC; ProdB should be excluded
    const stats = await getGlobalStats(undefined, { producteurs: ["ProdA", "ProdC"] }, testDb);
    expect(stats.count).toBe(2);
    expect(stats.avgCoutMinute).toBe(200); // (100 + 300) / 2
  });

  it("getGlobalStats combines dureeMinutes and producteurs filters", async () => {
    await insertProduction(
      makeExtraction({ producteur: "ProdA", dureeMinutes: 24, coutMinute: 100, totalDevis: 5000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdA", dureeMinutes: 52, coutMinute: 999, totalDevis: 99999 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdB", dureeMinutes: 24, coutMinute: 200, totalDevis: 10000 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "ProdC", dureeMinutes: 24, coutMinute: 888, totalDevis: 50000 }),
      { db: testDb },
    );

    // Only ProdA + ProdB, format 24'
    const stats = await getGlobalStats(
      undefined,
      { producteurs: ["ProdA", "ProdB"], dureeMinutes: 24 },
      testDb,
    );
    expect(stats.count).toBe(2);
    expect(stats.avgCoutMinute).toBe(150); // (100 + 200) / 2
  });

  it("getProducerRanking honors a producteurs subset filter", async () => {
    await insertProduction(makeExtraction({ producteur: "ProdA", coutMinute: 100, totalDevis: 5000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdB", coutMinute: 200, totalDevis: 10000 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "ProdC", coutMinute: 300, totalDevis: 15000 }), { db: testDb });

    const ranking = await getProducerRanking(undefined, { producteurs: ["ProdA", "ProdC"] }, testDb);
    expect(ranking).toHaveLength(2);
    expect(ranking.map((r) => r.producteur)).toEqual(["ProdA", "ProdC"]);
  });

  it("getComparisonFilterOptions returns distinct producteurs and durees", async () => {
    await insertProduction(makeExtraction({ producteur: "Studio Alpha", dureeMinutes: 24 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "Studio Alpha", dureeMinutes: 36 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "Boréal", dureeMinutes: 24 }), { db: testDb });
    await insertProduction(makeExtraction({ producteur: "Boréal", dureeMinutes: 52 }), { db: testDb });

    const opts = await getComparisonFilterOptions(undefined, testDb);
    expect(opts.producteurs).toEqual(["Boréal", "Studio Alpha"]); // alphabetical
    expect(opts.durees).toEqual([24, 36, 52]); // ascending, deduped
  });

  it("getComparisonFilterOptions filters by typeProduction", async () => {
    await insertProduction(
      makeExtraction({ producteur: "Studio Alpha", typeProduction: "Reportage", dureeMinutes: 24 }),
      { db: testDb },
    );
    await insertProduction(
      makeExtraction({ producteur: "Boréal", typeProduction: "Documentaire", dureeMinutes: 52 }),
      { db: testDb },
    );

    const opts = await getComparisonFilterOptions("Reportage", testDb);
    expect(opts.producteurs).toEqual(["Studio Alpha"]);
    expect(opts.durees).toEqual([24]);
  });
});
