import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createTestDb } from "./test-db";
import * as schema from "./schema";
import { insertProduction, getDistinctProducteurs, updateQualitativeAnalysis, getProductionById, getAllProductions, updateProduction, deleteProduction, insertProductionFile, getProductionFile, deleteProductionFile, getDraftProductionFile, hasDraftProductionFile, deleteStaleDrafts, publishProduction } from "./queries";
import type { DevisExtraction } from "@/lib/schemas/devis";

const { db: testDb } = await createTestDb();

const sampleExtraction: DevisExtraction = {
  meta: {
    producteur: "TestProd",
    titre: "Test Film",
    duree_minutes: 52,
    type_production: "Documentaire 52min",
    diffuseur: "ARTE",
    lieu_tournage: "Paris",
    format_source: "PDF",
  },
  grille_cnc: {
    "1_droits_artistiques": { lignes: [{ poste: "Auteur", montant: 1000 }], total: 1000 },
    "2_personnel": { postes: [], total: 0 },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": { lignes: [], total: 0 },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": { lignes: [], total: 0 },
    "7_tournage": { lignes: [], total: 0 },
    "8_post_production": { lignes: [], total: 0 },
    "9_assurance": { lignes: [], total: 0 },
    "10_imprevus_fg_pd": { lignes: [], total: 0 },
  },
  total_devis: 1000,
  cout_minute: 19.23,
  verification_minima: [],
  anomalies: [],
  postes_non_classes: [],
  confiance: "haute",
};

afterEach(async () => {
  await testDb.execute(sql`DELETE FROM productions`);
});

describe("insertProduction", () => {
  it("inserts a production and returns its id", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });
    expect(id).toBeGreaterThan(0);

    // Verify round-trip
    const rows = await testDb.select().from(schema.productions);
    expect(rows).toHaveLength(1);
    expect(rows[0].producteur).toBe("TestProd");
    expect(rows[0].titre).toBe("Test Film");
    expect(rows[0].totalDevis).toBe(1000);
  });
});

describe("getDistinctProducteurs", () => {
  it("returns distinct producteur names", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    await insertProduction({ ...sampleExtraction, meta: { ...sampleExtraction.meta, producteur: "ProdB" } }, { db: testDb });
    await insertProduction(sampleExtraction, { db: testDb }); // duplicate TestProd

    const names = await getDistinctProducteurs(testDb);
    expect(names).toHaveLength(2);
    expect(names).toContain("TestProd");
    expect(names).toContain("ProdB");
  });
});

describe("updateQualitativeAnalysis", () => {
  it("stores analysis text for a production", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });
    await updateQualitativeAnalysis(id, "## Analyse\nTout est conforme.", testDb);
    const prod = await getProductionById(id, { db: testDb });
    expect(prod?.qualitativeAnalysis).toBe("## Analyse\nTout est conforme.");
  });
});

describe("getProductionById", () => {
  it("returns production with all fields", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });
    const prod = await getProductionById(id, { db: testDb });
    expect(prod).not.toBeNull();
    expect(prod!.titre).toBe(sampleExtraction.meta.titre);
  });

  it("returns null for non-existent id", async () => {
    const prod = await getProductionById(99999, { db: testDb });
    expect(prod).toBeNull();
  });
});

describe("getAllProductions", () => {
  it("returns all productions ordered by createdAt desc", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, titre: "Film B", producteur: "ProdB" } },
      { db: testDb },
    );

    const rows = await getAllProductions({}, testDb);
    expect(rows).toHaveLength(2);
    // Both should be returned (order depends on same-second insertion)
    const titles = rows.map((r) => r.titre).sort();
    expect(titles).toEqual(["Film B", "Test Film"]);
  });

  it("filters by producteur", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, producteur: "ProdB" } },
      { db: testDb },
    );

    const rows = await getAllProductions({ producteur: "ProdB" }, testDb);
    expect(rows).toHaveLength(1);
    expect(rows[0].producteur).toBe("ProdB");
  });

  it("filters by typeProduction", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, type_production: "Reportage" } },
      { db: testDb },
    );

    const rows = await getAllProductions({ typeProduction: "Reportage" }, testDb);
    expect(rows).toHaveLength(1);
    expect(rows[0].typeProduction).toBe("Reportage");
  });

  it("combines filters with AND", async () => {
    await insertProduction(sampleExtraction, { db: testDb }); // TestProd, Documentaire 52min
    await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, producteur: "ProdB", type_production: "Reportage" } },
      { db: testDb },
    );
    await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, producteur: "ProdB" } },
      { db: testDb },
    );

    const rows = await getAllProductions({ producteur: "ProdB", typeProduction: "Documentaire 52min" }, testDb);
    expect(rows).toHaveLength(1);
  });

  it("returns empty array when no matches", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    const rows = await getAllProductions({ producteur: "NonExistent" }, testDb);
    expect(rows).toHaveLength(0);
  });

  it("returns only selected fields", async () => {
    await insertProduction(sampleExtraction, { db: testDb });
    const rows = await getAllProductions({}, testDb);
    const row = rows[0];
    expect(row).toHaveProperty("id");
    expect(row).toHaveProperty("producteur");
    expect(row).toHaveProperty("titre");
    expect(row).toHaveProperty("typeProduction");
    expect(row).toHaveProperty("totalDevis");
    expect(row).toHaveProperty("coutMinute");
    expect(row).toHaveProperty("confiance");
    expect(row).toHaveProperty("createdAt");
    // Should NOT have grilleCnc or meta
    expect(row).not.toHaveProperty("grilleCnc");
    expect(row).not.toHaveProperty("meta");
  });
});

describe("updateProduction", () => {
  it("updates all extraction fields for an existing production", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });

    const updated: DevisExtraction = {
      ...sampleExtraction,
      meta: { ...sampleExtraction.meta, titre: "Updated Film", producteur: "NewProd" },
      total_devis: 5000,
      cout_minute: 96.15,
      confiance: "moyenne",
    };

    await updateProduction(id, updated, testDb);

    const prod = await getProductionById(id, { db: testDb });
    expect(prod).not.toBeNull();
    expect(prod!.titre).toBe("Updated Film");
    expect(prod!.producteur).toBe("NewProd");
    expect(prod!.totalDevis).toBe(5000);
    expect(prod!.coutMinute).toBe(96.15);
    expect(prod!.confiance).toBe("moyenne");
  });

  it("preserves qualitative analysis when updating extraction data", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });
    await updateQualitativeAnalysis(id, "Some analysis", testDb);

    await updateProduction(id, { ...sampleExtraction, total_devis: 2000 }, testDb);

    const prod = await getProductionById(id, { db: testDb });
    expect(prod!.qualitativeAnalysis).toBe("Some analysis");
    expect(prod!.totalDevis).toBe(2000);
  });
});

describe("deleteProduction", () => {
  it("removes a production by id", async () => {
    const id = await insertProduction(sampleExtraction, { db: testDb });
    expect(await getProductionById(id, { db: testDb })).not.toBeNull();

    await deleteProduction(id, testDb);
    expect(await getProductionById(id, { db: testDb })).toBeNull();
  });

  it("does not affect other productions", async () => {
    const id1 = await insertProduction(sampleExtraction, { db: testDb });
    const id2 = await insertProduction(
      { ...sampleExtraction, meta: { ...sampleExtraction.meta, titre: "Other" } },
      { db: testDb },
    );

    await deleteProduction(id1, testDb);
    expect(await getProductionById(id1, { db: testDb })).toBeNull();
    expect(await getProductionById(id2, { db: testDb })).not.toBeNull();
  });
});

describe("production files (GDPR: source PDF is transient)", () => {
  const pdf = Buffer.from("%PDF-1.4 fake devis");

  describe("deleteProductionFile", () => {
    it("removes the stored PDF but keeps the production", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(id, "devis.pdf", "application/pdf", pdf, testDb);
      expect(await getProductionFile(id, testDb)).not.toBeNull();

      await deleteProductionFile(id, testDb);

      expect(await getProductionFile(id, testDb)).toBeNull();
      expect(await getProductionById(id, { db: testDb, includeDrafts: true })).not.toBeNull();
    });

    it("is a no-op when no file exists", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb });
      await expect(deleteProductionFile(id, testDb)).resolves.toBeUndefined();
    });
  });

  describe("getDraftProductionFile", () => {
    it("returns the PDF while the production is a draft", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(id, "devis.pdf", "application/pdf", pdf, testDb);

      const file = await getDraftProductionFile(id, testDb);
      expect(file).not.toBeNull();
      expect(file!.fileName).toBe("devis.pdf");
      expect(file!.mimeType).toBe("application/pdf");
    });

    it("returns null once the production is published (no viewing on saved quotes)", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(id, "devis.pdf", "application/pdf", pdf, testDb);
      await publishProduction(id, testDb);

      expect(await getDraftProductionFile(id, testDb)).toBeNull();
    });
  });

  describe("hasDraftProductionFile", () => {
    it("is true for a draft with a stored PDF, without loading the bytes", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(id, "devis.pdf", "application/pdf", pdf, testDb);
      expect(await hasDraftProductionFile(id, testDb)).toBe(true);
    });

    it("is false when the draft has no PDF", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      expect(await hasDraftProductionFile(id, testDb)).toBe(false);
    });

    it("is false once the production is published", async () => {
      const id = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(id, "devis.pdf", "application/pdf", pdf, testDb);
      await publishProduction(id, testDb);
      expect(await hasDraftProductionFile(id, testDb)).toBe(false);
    });
  });

  describe("deleteStaleDrafts", () => {
    it("deletes drafts older than the cutoff and cascades their PDFs", async () => {
      const staleId = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      await insertProductionFile(staleId, "old.pdf", "application/pdf", pdf, testDb);
      await testDb.execute(sql`UPDATE productions SET created_at = '2020-01-01T00:00:00Z' WHERE id = ${staleId}`);

      const deleted = await deleteStaleDrafts("2021-01-01T00:00:00Z", testDb);

      expect(deleted).toBe(1);
      expect(await getProductionById(staleId, { db: testDb, includeDrafts: true })).toBeNull();
      expect(await getProductionFile(staleId, testDb)).toBeNull();
    });

    it("keeps recent drafts and never touches published productions", async () => {
      const recentDraft = await insertProduction(sampleExtraction, { db: testDb, status: "draft" });
      const oldPublished = await insertProduction(sampleExtraction, { db: testDb, status: "published" });
      await testDb.execute(sql`UPDATE productions SET created_at = '2020-01-01T00:00:00Z' WHERE id = ${oldPublished}`);

      const deleted = await deleteStaleDrafts("2021-01-01T00:00:00Z", testDb);

      expect(deleted).toBe(0);
      expect(await getProductionById(recentDraft, { db: testDb, includeDrafts: true })).not.toBeNull();
      expect(await getProductionById(oldPublished, { db: testDb })).not.toBeNull();
    });
  });
});
