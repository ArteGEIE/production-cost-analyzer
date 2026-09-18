import { cache } from "react";
import { eq, desc, and, lt, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db as defaultDb } from "@/lib/db";
import { productions, productionFiles } from "@/lib/db/schema";
import type { DevisExtraction } from "@/lib/schemas/devis";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, any>;

export interface ProductionListFilters {
  producteur?: string;
  typeProduction?: string;
}

export const PUBLISHED = eq(productions.status, "published");

export interface InsertOptions {
  user?: { userId: string; userName: string };
  fileHash?: string;
  status?: "draft" | "published";
  db?: Db;
}

/**
 * Insert a validated extraction into the productions table.
 * Returns the auto-incremented production ID.
 */
export async function insertProduction(
  data: DevisExtraction,
  opts: InsertOptions = {},
): Promise<number> {
  const db = opts.db ?? defaultDb;
  const result = await db
    .insert(productions)
    .values({
      producteur: data.meta.producteur,
      titre: data.meta.titre,
      dureeMinutes: data.meta.duree_minutes,
      typeProduction: data.meta.type_production,
      totalDevis: data.total_devis,
      coutMinute: data.cout_minute,
      confiance: data.confiance,
      diffuseur: data.meta.diffuseur ?? null,
      lieuTournage: data.meta.lieu_tournage ?? null,
      grilleCnc: data.grille_cnc,
      meta: data.meta,
      verificationMinima: data.verification_minima,
      anomalies: data.anomalies,
      postesNonClasses: data.postes_non_classes,
      dateDevis: data.meta.date_devis ?? null,
      formatSource: data.meta.format_source ?? null,
      fileHash: opts.fileHash ?? null,
      cncFunding: data.meta.cnc_funding ?? false,
      status: opts.status ?? "published",
      userId: opts.user?.userId ?? null,
      userName: opts.user?.userName ?? null,
    })
    .returning({ id: productions.id });

  if (!result[0]) {
    throw new Error("Insert failed — no id returned");
  }

  return result[0].id;
}

/**
 * Find an existing production by file hash (for duplicate detection).
 */
export async function findByFileHash(hash: string, db: Db = defaultDb) {
  const rows = await db
    .select({
      id: productions.id,
      titre: productions.titre,
      producteur: productions.producteur,
      createdAt: productions.createdAt,
    })
    .from(productions)
    .where(and(eq(productions.fileHash, hash), PUBLISHED))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get distinct producteur names for autocomplete.
 */
export async function getDistinctProducteurs(
  db: Db = defaultDb,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ producteur: productions.producteur })
    .from(productions)
    .where(PUBLISHED);
  return rows.map((r) => r.producteur);
}

/**
 * Get distinct type_production values for filtering.
 */
export async function getDistinctTypeProductions(
  db: Db = defaultDb,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ typeProduction: productions.typeProduction })
    .from(productions)
    .where(PUBLISHED);
  return rows
    .map((r) => r.typeProduction)
    .filter((t): t is string => t != null)
    .sort();
}

/**
 * Store the qualitative analysis markdown text for a production.
 */
export async function updateQualitativeAnalysis(
  productionId: number,
  analysis: string,
  db: Db = defaultDb,
): Promise<void> {
  await db
    .update(productions)
    .set({ qualitativeAnalysis: analysis })
    .where(eq(productions.id, productionId));
}

/**
 * Delete a production by its id.
 */
export async function deleteProduction(
  id: number,
  db: Db = defaultDb,
): Promise<void> {
  await db.delete(productions).where(eq(productions.id, id));
}

/**
 * Update an existing production with new extraction data.
 * Used when editing the devis from the production detail page.
 */
export async function updateProduction(
  id: number,
  data: DevisExtraction,
  db: Db = defaultDb,
): Promise<void> {
  await db
    .update(productions)
    .set({
      producteur: data.meta.producteur,
      titre: data.meta.titre,
      dureeMinutes: data.meta.duree_minutes,
      typeProduction: data.meta.type_production,
      totalDevis: data.total_devis,
      coutMinute: data.cout_minute,
      confiance: data.confiance,
      diffuseur: data.meta.diffuseur ?? null,
      lieuTournage: data.meta.lieu_tournage ?? null,
      grilleCnc: data.grille_cnc,
      meta: data.meta,
      verificationMinima: data.verification_minima,
      anomalies: data.anomalies,
      postesNonClasses: data.postes_non_classes,
      dateDevis: data.meta.date_devis ?? null,
      formatSource: data.meta.format_source ?? null,
      cncFunding: data.meta.cnc_funding ?? false,
    })
    .where(eq(productions.id, id));
}

/**
 * Get a production by its id. Returns null if not found.
 */
export async function getProductionById(
  id: number,
  opts: { includeDrafts?: boolean; db?: Db } = {},
) {
  const db = opts.db ?? defaultDb;
  const conditions = [eq(productions.id, id)];
  if (!opts.includeDrafts) conditions.push(PUBLISHED);
  const rows = await db
    .select()
    .from(productions)
    .where(and(...conditions));
  return rows[0] ?? null;
}

/**
 * Get all productions with optional filters, sorted by createdAt desc.
 * Wrapped with React cache to deduplicate within a single server request
 * (layout + page both call this).
 */
export const getAllProductions = cache(async function getAllProductions(
  filters: ProductionListFilters = {},
  db: Db = defaultDb,
) {
  const conditions = [PUBLISHED];
  if (filters.producteur)
    conditions.push(eq(productions.producteur, filters.producteur));
  if (filters.typeProduction)
    conditions.push(eq(productions.typeProduction, filters.typeProduction));

  return db
    .select({
      id: productions.id,
      producteur: productions.producteur,
      titre: productions.titre,
      typeProduction: productions.typeProduction,
      totalDevis: productions.totalDevis,
      coutMinute: productions.coutMinute,
      confiance: productions.confiance,
      createdAt: productions.createdAt,
      anomalies: productions.anomalies,
      verificationMinima: productions.verificationMinima,
      dateDevis: productions.dateDevis,
      cncFunding: productions.cncFunding,
    })
    .from(productions)
    .where(and(...conditions))
    .orderBy(desc(productions.createdAt), desc(productions.id));
});

/**
 * Get all productions with full data (including grilleCnc, verificationMinima).
 * Used by analytics queries that need to aggregate in-memory.
 * Not wrapped with React cache — analytics pages handle their own caching.
 */
export async function getAllProductionsFull(db: Db = defaultDb) {
  return db
    .select({
      id: productions.id,
      producteur: productions.producteur,
      titre: productions.titre,
      typeProduction: productions.typeProduction,
      totalDevis: productions.totalDevis,
      coutMinute: productions.coutMinute,
      confiance: productions.confiance,
      createdAt: productions.createdAt,
      formatSource: productions.formatSource,
      grilleCnc: productions.grilleCnc,
      verificationMinima: productions.verificationMinima,
    })
    .from(productions)
    .where(PUBLISHED)
    .orderBy(desc(productions.createdAt), desc(productions.id));
}

/**
 * Rename a producer across all productions.
 * Updates both the producteur column and meta.producteur JSON field.
 */
export async function renameProducteur(
  oldName: string,
  newName: string,
  db: Db = defaultDb,
): Promise<number> {
  const result = await db
    .update(productions)
    .set({
      producteur: newName,
      meta: sql`jsonb_set(${productions.meta}::jsonb, '{producteur}', to_jsonb(${newName}::text))`,
    })
    .where(eq(productions.producteur, oldName))
    .returning({ id: productions.id });
  return result.length;
}

/**
 * Rename a production type across all productions.
 * Updates both the typeProduction column and meta.type_production JSON field.
 */
export async function renameProductionType(
  oldType: string,
  newType: string,
  db: Db = defaultDb,
): Promise<number> {
  const result = await db
    .update(productions)
    .set({
      typeProduction: newType,
      meta: sql`jsonb_set(${productions.meta}::jsonb, '{type_production}', to_jsonb(${newType}::text))`,
    })
    .where(eq(productions.typeProduction, oldType))
    .returning({ id: productions.id });
  return result.length;
}

/**
 * Get distinct producers with their production count.
 */
export async function getProducersWithCount(
  db: Db = defaultDb,
): Promise<{ producteur: string; count: number }[]> {
  const rows = await db
    .select({
      producteur: productions.producteur,
      count: sql<number>`count(*)`,
    })
    .from(productions)
    .where(PUBLISHED)
    .groupBy(productions.producteur)
    .orderBy(productions.producteur);
  return rows;
}

// --- Production files ---

export async function insertProductionFile(
  productionId: number,
  fileName: string,
  mimeType: string,
  data: Buffer,
  db: Db = defaultDb,
): Promise<number> {
  const result = await db
    .insert(productionFiles)
    .values({ productionId, fileName, mimeType, data })
    .onConflictDoUpdate({
      target: productionFiles.productionId,
      set: { fileName, mimeType, data, createdAt: new Date().toISOString() },
    })
    .returning({ id: productionFiles.id });
  return result[0]!.id;
}

export async function getProductionFile(productionId: number, db: Db = defaultDb) {
  const rows = await db
    .select()
    .from(productionFiles)
    .where(eq(productionFiles.productionId, productionId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * GDPR: the source PDF is only available while a production is a draft
 * (i.e. during import/review). Once published, the PDF must no longer be served.
 * Joining on status enforces this at the data layer, independent of the UI.
 */
export async function getDraftProductionFile(productionId: number, db: Db = defaultDb) {
  const rows = await db
    .select({
      fileName: productionFiles.fileName,
      mimeType: productionFiles.mimeType,
      data: productionFiles.data,
    })
    .from(productionFiles)
    .innerJoin(productions, eq(productions.id, productionFiles.productionId))
    .where(and(eq(productionFiles.productionId, productionId), eq(productions.status, "draft")))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Existence check for a draft's source PDF — deliberately does NOT select the
 * `data` bytea, so pages that only need to know whether to show a "Voir le PDF"
 * toggle don't pull a multi-MB payload into memory on every render. Use
 * `getDraftProductionFile` only when the bytes are actually served.
 */
export async function hasDraftProductionFile(productionId: number, db: Db = defaultDb): Promise<boolean> {
  const rows = await db
    .select({ id: productionFiles.id })
    .from(productionFiles)
    .innerJoin(productions, eq(productions.id, productionFiles.productionId))
    .where(and(eq(productionFiles.productionId, productionId), eq(productions.status, "draft")))
    .limit(1);
  return rows.length > 0;
}

/**
 * GDPR: the source PDF must not be persisted on a saved quote. Called
 * when a draft is published so the transient PDF is dropped.
 */
export async function deleteProductionFile(productionId: number, db: Db = defaultDb): Promise<void> {
  await db.delete(productionFiles).where(eq(productionFiles.productionId, productionId));
}

export async function publishProduction(id: number, db: Db = defaultDb): Promise<void> {
  await db
    .update(productions)
    .set({ status: "published" })
    .where(eq(productions.id, id));
}

export async function deleteDraftsByFileHash(fileHash: string, db: Db = defaultDb): Promise<void> {
  await db
    .delete(productions)
    .where(and(eq(productions.fileHash, fileHash), eq(productions.status, "draft")));
}

/**
 * GDPR: purge drafts (and, by cascade, their stored PDFs) abandoned
 * before `cutoffIso`. Bounds how long a never-published source PDF can linger.
 * `created_at` is stored as an ISO-8601 UTC string, so lexicographic `<` is a
 * valid chronological comparison. Returns the number of drafts removed.
 */
export async function deleteStaleDrafts(cutoffIso: string, db: Db = defaultDb): Promise<number> {
  const deleted = await db
    .delete(productions)
    .where(and(eq(productions.status, "draft"), lt(productions.createdAt, cutoffIso)))
    .returning({ id: productions.id });
  return deleted.length;
}
