import { eq, desc, and, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { productions } from "@/lib/db/schema";
import { PUBLISHED, type Db } from "./queries";

/**
 * Optional filters shared by comparison queries on this page.
 * - producteurs: restrict the peer set considered in "global"/cross-producer stats
 * - dureeMinutes: restrict to productions of the chosen format (exact match)
 */
export interface ComparisonFilters {
  producteurs?: string[];
  dureeMinutes?: number;
}

const CNC_CATEGORIES = [
  "1_droits_artistiques",
  "2_personnel",
  "3_interpretation",
  "4_charges_sociales",
  "5_decors_costumes",
  "6_transport",
  "7_tournage",
  "8_post_production",
  "9_assurance",
  "10_imprevus_fg_pd",
] as const;

export type CncCategoryKey = (typeof CNC_CATEGORIES)[number];

export interface ProductionStats {
  avgCoutMinute: number;
  count: number;
  avgStructure: Record<string, number>;
}

export interface ProducerRankingRow {
  producteur: string;
  avgCoutMinute: number;
  count: number;
}

/**
 * Get all productions for a specific producer, sorted by createdAt desc.
 */
export async function getProductionsByProducteur(
  producteur: string,
  db: Db = defaultDb,
) {
  return db
    .select()
    .from(productions)
    .where(and(eq(productions.producteur, producteur), PUBLISHED))
    .orderBy(desc(productions.createdAt));
}

/**
 * Compute stats for a single producer: average cost/minute, count,
 * and average CNC category structure (% of total). Honors the duration
 * filter so a producer's average is computed only on comparable formats.
 */
export async function getProductionStats(
  producteur: string,
  typeFilter?: string,
  filters: ComparisonFilters = {},
  db: Db = defaultDb,
): Promise<ProductionStats> {
  const conditions = [eq(productions.producteur, producteur), PUBLISHED];
  if (typeFilter) conditions.push(eq(productions.typeProduction, typeFilter));
  if (filters.dureeMinutes != null) conditions.push(eq(productions.dureeMinutes, filters.dureeMinutes));

  const rows = await db
    .select()
    .from(productions)
    .where(and(...conditions));

  return computeStats(rows);
}

/**
 * Compute "peer" stats across the producer set selected by the user.
 * When no producteurs filter is set, this is the full cross-producer average.
 */
export async function getGlobalStats(
  typeFilter?: string,
  filters: ComparisonFilters = {},
  db: Db = defaultDb,
): Promise<ProductionStats> {
  const conditions = [PUBLISHED];
  if (typeFilter) conditions.push(eq(productions.typeProduction, typeFilter));
  if (filters.dureeMinutes != null) conditions.push(eq(productions.dureeMinutes, filters.dureeMinutes));
  if (filters.producteurs && filters.producteurs.length > 0) {
    conditions.push(inArray(productions.producteur, filters.producteurs));
  }

  const rows = await db
    .select()
    .from(productions)
    .where(and(...conditions));

  return computeStats(rows);
}

/**
 * Rank producers by average cost/minute (ascending), optionally filtered by type,
 * duration and a producer subset.
 */
export async function getProducerRanking(
  typeProduction?: string,
  filters: ComparisonFilters = {},
  db: Db = defaultDb,
): Promise<ProducerRankingRow[]> {
  const conditions = [PUBLISHED];
  if (typeProduction) conditions.push(eq(productions.typeProduction, typeProduction));
  if (filters.dureeMinutes != null) conditions.push(eq(productions.dureeMinutes, filters.dureeMinutes));
  if (filters.producteurs && filters.producteurs.length > 0) {
    conditions.push(inArray(productions.producteur, filters.producteurs));
  }

  const rows = await db
    .select()
    .from(productions)
    .where(and(...conditions));

  // Group by producteur
  const byProducteur = new Map<string, number[]>();
  for (const row of rows) {
    const list = byProducteur.get(row.producteur) ?? [];
    if (row.coutMinute != null) list.push(row.coutMinute);
    byProducteur.set(row.producteur, list);
  }

  const ranking: ProducerRankingRow[] = [];
  for (const [producteur, costs] of byProducteur) {
    if (costs.length === 0) continue;
    ranking.push({
      producteur,
      avgCoutMinute: costs.reduce((a, b) => a + b, 0) / costs.length,
      count: costs.length,
    });
  }

  return ranking.sort((a, b) => a.avgCoutMinute - b.avgCoutMinute);
}

export interface RoleHistoryEntry {
  productionId: number;
  titre: string;
  tarifJournalier: number;
  nombreJours: number;
  dateDevis: string | null;
}

export interface ProducerRoleStats {
  roleKey: string;
  label: string;
  avgRate: number;
  minRate: number;
  maxRate: number;
  occurrences: RoleHistoryEntry[];
}

/**
 * Get per-role rate history for a producer across all their productions.
 * Returns only salarié roles with daily rates (excludes forfaits/prestataires).
 * Honors the duration filter so role rates compare only on similar formats.
 */
export async function getProducerRoleHistory(
  producteur: string,
  typeFilter?: string,
  filters: ComparisonFilters = {},
  db: Db = defaultDb,
): Promise<ProducerRoleStats[]> {
  const conditions = [eq(productions.producteur, producteur), PUBLISHED];
  if (typeFilter) conditions.push(eq(productions.typeProduction, typeFilter));
  if (filters.dureeMinutes != null) conditions.push(eq(productions.dureeMinutes, filters.dureeMinutes));

  const rows = await db
    .select()
    .from(productions)
    .where(and(...conditions));

  const roleMap = new Map<string, { label: string; entries: RoleHistoryEntry[] }>();

  for (const row of rows) {
    const grille = row.grilleCnc as Record<string, unknown> | null;
    if (!grille) continue;
    const personnel = grille["2_personnel"] as { postes?: unknown[] } | undefined;
    if (!personnel?.postes) continue;

    for (const p of personnel.postes as {
      poste?: string;
      role_key?: string;
      tarif_journalier?: number;
      nombre_jours?: number;
      type_contrat?: string;
    }[]) {
      if (!p.role_key || !p.tarif_journalier || p.tarif_journalier <= 0) continue;
      if (p.type_contrat === "forfait" || p.type_contrat === "prestataire" || p.type_contrat === "etranger") continue;

      const existing = roleMap.get(p.role_key);
      const entry: RoleHistoryEntry = {
        productionId: row.id,
        titre: row.titre,
        tarifJournalier: p.tarif_journalier,
        nombreJours: p.nombre_jours ?? 0,
        dateDevis: row.dateDevis,
      };

      if (existing) {
        existing.entries.push(entry);
      } else {
        roleMap.set(p.role_key, { label: p.poste ?? p.role_key, entries: [entry] });
      }
    }
  }

  const results: ProducerRoleStats[] = [];
  for (const [roleKey, { label, entries }] of roleMap) {
    const rates = entries.map((e) => e.tarifJournalier);
    results.push({
      roleKey,
      label,
      avgRate: Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100,
      minRate: Math.min(...rates),
      maxRate: Math.max(...rates),
      occurrences: entries.sort((a, b) => (b.dateDevis ?? "").localeCompare(a.dateDevis ?? "")),
    });
  }

  return results;
}

/**
 * Get the distinct producers and durations available in published productions,
 * optionally restricted to a given type. Used to populate the comparison filter
 * UI on /productions/[id]/comparison.
 */
export async function getComparisonFilterOptions(
  typeFilter?: string,
  db: Db = defaultDb,
): Promise<{ producteurs: string[]; durees: number[] }> {
  const conditions = [PUBLISHED];
  if (typeFilter) conditions.push(eq(productions.typeProduction, typeFilter));

  const rows = await db
    .select({ producteur: productions.producteur, dureeMinutes: productions.dureeMinutes })
    .from(productions)
    .where(and(...conditions));

  const producerSet = new Set<string>();
  const durationSet = new Set<number>();
  for (const r of rows) {
    if (r.producteur) producerSet.add(r.producteur);
    if (r.dureeMinutes != null) durationSet.add(r.dureeMinutes);
  }

  return {
    producteurs: Array.from(producerSet).sort((a, b) => a.localeCompare(b, "fr")),
    durees: Array.from(durationSet).sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ProductionRow {
  totalDevis: number | null;
  coutMinute: number | null;
  grilleCnc: unknown;
}

function computeStats(rows: ProductionRow[]): ProductionStats {
  if (rows.length === 0) {
    return {
      avgCoutMinute: 0,
      count: 0,
      avgStructure: Object.fromEntries(CNC_CATEGORIES.map((k) => [k, 0])),
    };
  }

  // Average cost/minute
  const costsPerMinute = rows
    .filter((r) => r.coutMinute != null)
    .map((r) => r.coutMinute!);
  const avgCoutMinute =
    costsPerMinute.length > 0
      ? costsPerMinute.reduce((a, b) => a + b, 0) / costsPerMinute.length
      : 0;

  // Average structure: for each production, compute category % of total, then average
  const structureSums: Record<string, number> = Object.fromEntries(
    CNC_CATEGORIES.map((k) => [k, 0]),
  );
  let structureCount = 0;

  for (const row of rows) {
    const totalDevis = row.totalDevis;
    if (!totalDevis || totalDevis <= 0) continue;

    const grille = row.grilleCnc as Record<string, unknown> | null;
    if (!grille) continue;

    structureCount++;
    for (const cat of CNC_CATEGORIES) {
      const catData = grille[cat] as { total?: number } | number | undefined;
      let catTotal = 0;
      if (typeof catData === "number") {
        catTotal = catData;
      } else if (catData && typeof catData === "object" && "total" in catData) {
        catTotal = catData.total ?? 0;
      }
      structureSums[cat] += catTotal / totalDevis;
    }
  }

  const avgStructure: Record<string, number> = {};
  for (const cat of CNC_CATEGORIES) {
    avgStructure[cat] =
      structureCount > 0 ? structureSums[cat] / structureCount : 0;
  }

  return {
    avgCoutMinute,
    count: costsPerMinute.length,
    avgStructure,
  };
}
