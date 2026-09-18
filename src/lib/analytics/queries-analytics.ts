import { getAllProductionsFull } from "../db/queries";
import { CC_FALLBACK_RATES } from "../config/cc-minimums";
import { DEFAULT_CNC_MAPPING } from "../config/cnc-mapping";
import { cncGrid } from "../config/cnc-grid";
import { getThresholdConfig } from "../db/queries-settings";
import { mapXlsxLabelToRoleKey } from "./seed-job-mapping";
import { isNonConforme } from "../anomalies/anomaly-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Period {
  from: Date;
  to: Date;
}

export interface JobSummaryRow {
  roleKey: string;
  label: string;
  occurrences: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  ccMinimum: number | null;
}

export interface JobDetailResult {
  roleKey: string;
  label: string;
  ccMinimum: number | null;
  globalAvgRate: number;
  occurrences: Array<{
    productionId: number;
    titre: string;
    producteur: string;
    tarifJournalier: number;
    nombreJours: number;
    total: number;
    createdAt: string;
  }>;
}

export interface CategorySummaryRow {
  categoryKey: string;
  avgAmount: number;
  avgPct: number;
  minAmount: number;
  maxAmount: number;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  topSubCategories: Array<{ name: string; avgAmount: number; count: number }>;
}

export interface CategoryDetailResult {
  categoryKey: string;
  avgAmount: number;
  avgPct: number;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  productionCount: number;
  producerBreakdown: Array<{
    producteur: string;
    avgAmount: number;
    count: number;
  }>;
  subCategories: Array<{ name: string; avgAmount: number; count: number }>;
  lineItems: Array<{
    poste: string;
    montant: number;
    sousCategorie: string | null;
    productionId: number;
    titre: string;
    producteur: string;
    createdAt: string;
  }>;
  productions: Array<{
    id: number;
    titre: string;
    producteur: string;
    amount: number;
    pct: number;
    createdAt: string;
  }>;
}

export interface ComplianceMatrixRow {
  roleKey: string;
  label: string;
  ccMinimum: number | null;
  producers: Array<{
    producteur: string;
    avgRate: number;
    occurrences: number;
    statut: "conforme" | "non_conforme" | "no_data";
  }>;
}

export interface ProducerSummaryRow {
  producteur: string;
  productionCount: number;
  avgCoutMinute: number;
  trend: "up" | "down" | "stable";
  ccAlertCount: number;
}

export interface ProducerDetailResult {
  producteur: string;
  productionCount: number;
  avgCoutMinute: number;
  dateRange: { first: string; last: string };
  avgStructure: Record<string, number>;
  globalAvgStructure: Record<string, number>;
  ccAlerts: Array<{
    rule: string;
    roleKey: string | null;
    description: string;
    count: number;
    total: number;
  }>;
  productions: Array<{
    id: number;
    titre: string;
    totalDevis: number;
    coutMinute: number;
    alertCount: number;
    createdAt: string;
  }>;
  history: Array<{
    id: number;
    titre: string;
    coutMinute: number;
    createdAt: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CNC_CATEGORY_KEYS: string[] = cncGrid.map((cat) => cat.key);

const CNC_ROLE_ORDER = new Map(
  DEFAULT_CNC_MAPPING
    .filter((m) => m.cnc_category === "2_personnel")
    .map((m, i) => [m.role_key, i]),
);

function cncRoleSort(a: { roleKey: string }, b: { roleKey: string }): number {
  const ai = CNC_ROLE_ORDER.get(a.roleKey) ?? 999;
  const bi = CNC_ROLE_ORDER.get(b.roleKey) ?? 999;
  if (ai !== bi) return ai - bi;
  return a.roleKey.localeCompare(b.roleKey);
}

// ---------------------------------------------------------------------------
// Internal types for raw DB production
// ---------------------------------------------------------------------------

interface RawPoste {
  poste: string;
  role_key: string;
  tarif_journalier: number;
  nombre_jours: number;
  total: number;
  type_contrat?: string | null;
}

interface RawLigne {
  poste: string;
  montant: number;
  sous_categorie?: string;
}

interface RawCategoryWithPostes {
  postes?: RawPoste[];
  lignes?: RawLigne[];
  total: number;
}

interface RawCategoryWithLignes {
  lignes?: RawLigne[];
  total: number;
}

type RawCategory = RawCategoryWithPostes | RawCategoryWithLignes;

type RawGrilleCnc = Record<string, RawCategory>;

interface RawVerifEntry {
  poste: string;
  tarif_journalier: number;
  minimum_cc: number | null;
  ecart_pourcent: number | null;
  statut: "conforme" | "non_conforme" | "hors_nomenclature";
}

type FullProduction = Awaited<ReturnType<typeof getAllProductionsFull>>[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize sub-category keys: camelCase → snake_case + alias merging */
const SUB_CAT_ALIASES: Record<string, string> = {
  production_deleguee: "prod_deleguee",
};

function normalizeSubCatKey(raw: string): string {
  // camelCase → snake_case
  const snake = raw.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  return SUB_CAT_ALIASES[snake] ?? snake;
}

export function filterByPeriod<T extends { createdAt: string }>(
  items: T[],
  period?: Period,
): T[] {
  if (!period) return items;
  return items.filter((item) => {
    const date = new Date(item.createdAt);
    return date >= period.from && date <= period.to;
  });
}

export function filterByType<T extends { typeProduction: string | null }>(
  items: T[],
  typeProduction?: string,
): T[] {
  if (!typeProduction) return items;
  return items.filter((item) => item.typeProduction === typeProduction);
}

export function computeTrend(
  productions: Array<{ coutMinute: number | null }>,
): "up" | "down" | "stable" {
  if (productions.length < 2) return "stable";

  const mid = Math.floor(productions.length / 2);
  const firstHalf = productions.slice(0, mid);
  const secondHalf = productions.slice(mid);

  const validFirst = firstHalf.map((p) => p.coutMinute).filter((v): v is number => v != null && v > 0);
  const validSecond = secondHalf.map((p) => p.coutMinute).filter((v): v is number => v != null && v > 0);

  if (validFirst.length === 0 || validSecond.length === 0) return "stable";

  const avgFirst = avg(validFirst);
  const avgSecond = avg(validSecond);

  if (avgFirst === 0) return "stable";
  const change = (avgSecond - avgFirst) / avgFirst;

  if (change > 0.1) return "up";
  if (change < -0.1) return "down";
  return "stable";
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function getGrilleCnc(prod: FullProduction): RawGrilleCnc {
  return (prod.grilleCnc as RawGrilleCnc) ?? {};
}

function getCategoryTotal(grille: RawGrilleCnc, key: string): number {
  const cat = grille[key];
  if (!cat) return 0;
  if (typeof cat === "number") return cat;
  return (cat as RawCategory).total ?? 0;
}

function getPostes(grille: RawGrilleCnc): RawPoste[] {
  const personnel = grille["2_personnel"] as RawCategoryWithPostes | undefined;
  return personnel?.postes ?? [];
}

/** True when the poste has a meaningful daily rate (not a forfait/lump sum). */
function isDailyRate(poste: RawPoste): boolean {
  return poste.tarif_journalier > 0 && poste.type_contrat !== "forfait";
}

function getLignes(grille: RawGrilleCnc, key: string): RawLigne[] {
  const cat = grille[key] as RawCategoryWithLignes | undefined;
  return cat?.lignes ?? [];
}

function getVerifEntries(prod: FullProduction): RawVerifEntry[] {
  return (prod.verificationMinima as RawVerifEntry[] | null) ?? [];
}

function countCcAlerts(verifs: RawVerifEntry[]): number {
  return verifs.filter(
    (v) => v.statut === "non_conforme",
  ).length;
}

function getCcMinimum(roleKey: string): number | null {
  const entry = CC_FALLBACK_RATES[roleKey];
  return entry?.minimum ?? null;
}

function getRoleLabel(roleKey: string): string {
  const ccEntry = CC_FALLBACK_RATES[roleKey];
  if (ccEntry) return ccEntry.label;
  const cncEntry = DEFAULT_CNC_MAPPING.find((m) => m.role_key === roleKey);
  return cncEntry?.labels.fr ?? roleKey;
}

function computeStructure(
  productions: FullProduction[],
): Record<string, number> {
  const structure: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const prod of productions) {
    const grille = getGrilleCnc(prod);
    const total = prod.totalDevis ?? 0;
    if (total <= 0) continue;

    for (const key of CNC_CATEGORY_KEYS) {
      const catTotal = getCategoryTotal(grille, key);
      const pct = catTotal / total;
      structure[key] = (structure[key] ?? 0) + pct;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  for (const key of Object.keys(structure)) {
    if (counts[key] > 0) {
      structure[key] = structure[key] / counts[key];
    }
  }

  return structure;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Aggregate job roles across all productions.
 * Groups by role_key, computes avg/min/max daily rates, includes CC minimum.
 */
export async function getJobSummary(
  period?: Period,
  typeProduction?: string,
): Promise<JobSummaryRow[]> {
  const allProductions = await getAllProductionsFull();
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  if (filtered.length === 0) return [];

  const roleMap = new Map<
    string,
    { label: string; rates: number[]; productionIds: Set<number> }
  >();

  for (const prod of filtered) {
    const grille = getGrilleCnc(prod);
    const postes = getPostes(grille);

    for (const poste of postes) {
      if (!poste.role_key || !isDailyRate(poste)) continue;

      const existing = roleMap.get(poste.role_key);
      if (existing) {
        existing.rates.push(poste.tarif_journalier);
        existing.productionIds.add(prod.id);
      } else {
        roleMap.set(poste.role_key, {
          label: getRoleLabel(poste.role_key),
          rates: [poste.tarif_journalier],
          productionIds: new Set([prod.id]),
        });
      }
    }
  }

  const rows: JobSummaryRow[] = [];
  for (const [roleKey, data] of roleMap) {
    rows.push({
      roleKey,
      label: data.label,
      occurrences: data.productionIds.size,
      avgRate: Math.round(avg(data.rates) * 100) / 100,
      minRate: Math.min(...data.rates),
      maxRate: Math.max(...data.rates),
      ccMinimum: getCcMinimum(roleKey),
    });
  }

  rows.sort(cncRoleSort);
  return rows;
}

/**
 * Detail view for a specific job role: all occurrences with production metadata.
 */
export async function getJobDetail(
  roleKey: string,
  period?: Period,
  typeProduction?: string,
): Promise<JobDetailResult | null> {
  const allProductions = await getAllProductionsFull();
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  const occurrences: JobDetailResult["occurrences"] = [];

  for (const prod of filtered) {
    const grille = getGrilleCnc(prod);
    const postes = getPostes(grille);

    for (const poste of postes) {
      if (poste.role_key !== roleKey || !isDailyRate(poste)) continue;
      occurrences.push({
        productionId: prod.id,
        titre: prod.titre,
        producteur: prod.producteur,
        tarifJournalier: poste.tarif_journalier,
        nombreJours: poste.nombre_jours,
        total: poste.total,
        createdAt: prod.createdAt,
      });
    }
  }

  if (occurrences.length === 0) return null;

  const rates = occurrences.map((o) => o.tarifJournalier);

  return {
    roleKey,
    label: getRoleLabel(roleKey),
    ccMinimum: getCcMinimum(roleKey),
    globalAvgRate: Math.round(avg(rates) * 100) / 100,
    occurrences,
  };
}

/**
 * Summary of all 10 CNC categories across productions.
 */
export async function getCategorySummary(
  period?: Period,
  typeProduction?: string,
): Promise<CategorySummaryRow[]> {
  const [allProductions, thresholdConfig] = await Promise.all([
    getAllProductionsFull(),
    getThresholdConfig(),
  ]);
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  if (filtered.length === 0) return [];

  const rows: CategorySummaryRow[] = [];

  for (const key of CNC_CATEGORY_KEYS) {
    const amounts: number[] = [];
    const pcts: number[] = [];

    for (const prod of filtered) {
      const grille = getGrilleCnc(prod);
      const catTotal = getCategoryTotal(grille, key);
      const totalDevis = prod.totalDevis ?? 0;

      amounts.push(catTotal);
      if (totalDevis > 0) {
        pcts.push(catTotal / totalDevis);
      }
    }

    const threshold = thresholdConfig.structural[key];

    // Aggregate sub-categories from lignes
    const subCatMap = new Map<string, { total: number; count: number }>();
    for (const prod of filtered) {
      const grille = getGrilleCnc(prod);
      const lignes = getLignes(grille, key);
      for (const ligne of lignes) {
        const subKey = normalizeSubCatKey(ligne.sous_categorie ?? ligne.poste ?? "");
        if (!subKey) continue;
        const existing = subCatMap.get(subKey);
        if (existing) {
          existing.total += ligne.montant;
          existing.count++;
        } else {
          subCatMap.set(subKey, { total: ligne.montant, count: 1 });
        }
      }
    }

    const topSubCategories = [...subCatMap.entries()]
      .map(([name, { total, count }]) => ({
        name,
        avgAmount: Math.round((total / count) * 100) / 100,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    rows.push({
      categoryKey: key,
      avgAmount: Math.round(avg(amounts) * 100) / 100,
      avgPct: pcts.length > 0 ? avg(pcts) : 0,
      minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
      maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      thresholdLow: threshold?.low ?? null,
      thresholdHigh: threshold?.high ?? null,
      topSubCategories,
    });
  }

  return rows;
}

/**
 * Detail view for a specific CNC category: producer breakdown, sub-categories, production list.
 */
export async function getCategoryDetail(
  categoryKey: string,
  period?: Period,
  typeProduction?: string,
): Promise<CategoryDetailResult | null> {
  if (!CNC_CATEGORY_KEYS.includes(categoryKey)) return null;

  const [allProductions, thresholdConfig] = await Promise.all([
    getAllProductionsFull(),
    getThresholdConfig(),
  ]);
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  const amounts: number[] = [];
  const pcts: number[] = [];
  const producerAmounts = new Map<string, { total: number; count: number }>();
  const subCatMap = new Map<string, { total: number; count: number }>();
  const lineItems: CategoryDetailResult["lineItems"] = [];
  const productionList: CategoryDetailResult["productions"] = [];

  for (const prod of filtered) {
    const grille = getGrilleCnc(prod);
    const catTotal = getCategoryTotal(grille, categoryKey);
    const totalDevis = prod.totalDevis ?? 0;
    const pct = totalDevis > 0 ? catTotal / totalDevis : 0;

    amounts.push(catTotal);
    if (totalDevis > 0) pcts.push(pct);

    // Producer breakdown
    const existing = producerAmounts.get(prod.producteur);
    if (existing) {
      existing.total += catTotal;
      existing.count += 1;
    } else {
      producerAmounts.set(prod.producteur, { total: catTotal, count: 1 });
    }

    // Sub-categories from lignes
    const lignes = getLignes(grille, categoryKey);
    for (const ligne of lignes) {
      const subKey = normalizeSubCatKey(ligne.sous_categorie ?? ligne.poste ?? "");
      const subExisting = subCatMap.get(subKey);
      if (subExisting) {
        subExisting.total += ligne.montant;
        subExisting.count += 1;
      } else {
        subCatMap.set(subKey, { total: ligne.montant, count: 1 });
      }
      lineItems.push({
        poste: ligne.poste ?? "",
        montant: ligne.montant,
        sousCategorie: ligne.sous_categorie ?? null,
        productionId: prod.id,
        titre: prod.titre,
        producteur: prod.producteur,
        createdAt: prod.createdAt,
      });
    }

    // Production list
    productionList.push({
      id: prod.id,
      titre: prod.titre,
      producteur: prod.producteur,
      amount: catTotal,
      pct,
      createdAt: prod.createdAt,
    });
  }

  const threshold = thresholdConfig.structural[categoryKey];

  const producerBreakdown = Array.from(producerAmounts.entries())
    .map(([producteur, data]) => ({
      producteur,
      avgAmount: Math.round((data.total / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  const subCategories = Array.from(subCatMap.entries())
    .map(([name, data]) => ({
      name,
      avgAmount: Math.round((data.total / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.avgAmount - a.avgAmount);

  return {
    categoryKey,
    avgAmount: Math.round(avg(amounts) * 100) / 100,
    avgPct: pcts.length > 0 ? avg(pcts) : 0,
    thresholdLow: threshold?.low ?? null,
    thresholdHigh: threshold?.high ?? null,
    productionCount: filtered.length,
    producerBreakdown,
    subCategories,
    lineItems: lineItems.sort((a, b) => b.montant - a.montant),
    productions: productionList,
  };
}

/**
 * Summary of all producers: production count, avg cost/minute, trend, CC alerts.
 */
export async function getProducerSummary(
  period?: Period,
  typeProduction?: string,
): Promise<ProducerSummaryRow[]> {
  const allProductions = await getAllProductionsFull();
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  if (filtered.length === 0) return [];

  const producerMap = new Map<string, FullProduction[]>();

  for (const prod of filtered) {
    const existing = producerMap.get(prod.producteur);
    if (existing) {
      existing.push(prod);
    } else {
      producerMap.set(prod.producteur, [prod]);
    }
  }

  const rows: ProducerSummaryRow[] = [];

  for (const [producteur, prods] of producerMap) {
    const coutMinutes = prods
      .map((p) => p.coutMinute)
      .filter((c): c is number => c != null && c > 0);

    // Sort by createdAt for trend computation
    const sorted = [...prods].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let totalAlerts = 0;
    for (const prod of prods) {
      totalAlerts += countCcAlerts(getVerifEntries(prod));
    }

    rows.push({
      producteur,
      productionCount: prods.length,
      avgCoutMinute:
        coutMinutes.length > 0
          ? Math.round(avg(coutMinutes) * 100) / 100
          : 0,
      trend: computeTrend(sorted),
      ccAlertCount: totalAlerts,
    });
  }

  // Sort by production count descending
  rows.sort((a, b) => b.productionCount - a.productionCount);
  return rows;
}

/**
 * Full detail view for a specific producer.
 */
export async function getProducerDetail(
  name: string,
  period?: Period,
  typeProduction?: string,
): Promise<ProducerDetailResult | null> {
  const allProductions = await getAllProductionsFull();
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  const producerProds = filtered.filter((p) => p.producteur === name);
  if (producerProds.length === 0) return null;

  // Sort by date ascending
  const sorted = [...producerProds].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const coutMinutes = sorted
    .map((p) => p.coutMinute)
    .filter((c): c is number => c != null && c > 0);

  // CC alerts grouped by rule+role
  const alertMap = new Map<
    string,
    { rule: string; roleKey: string | null; description: string; count: number }
  >();

  for (const prod of producerProds) {
    const verifs = getVerifEntries(prod);

    for (const v of verifs) {
      if (v.statut !== "non_conforme") continue;

      const rule = "R1";
      const key = `${rule}:${v.poste}`;
      const existing = alertMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        alertMap.set(key, {
          rule,
          roleKey: mapXlsxLabelToRoleKey(v.poste),
          description: v.poste,
          count: 1,
        });
      }
    }
  }

  const totalProdsWithVerifs = producerProds.filter(
    (p) => getVerifEntries(p).length > 0,
  ).length;
  const ccAlerts = Array.from(alertMap.values()).map((a) => ({
    ...a,
    total: totalProdsWithVerifs,
  }));

  // Productions list
  const productions = sorted.map((p) => ({
    id: p.id,
    titre: p.titre,
    totalDevis: p.totalDevis ?? 0,
    coutMinute: p.coutMinute ?? 0,
    alertCount: countCcAlerts(getVerifEntries(p)),
    createdAt: p.createdAt,
  }));

  // History (for trend chart)
  const history = sorted.map((p) => ({
    id: p.id,
    titre: p.titre,
    coutMinute: p.coutMinute ?? 0,
    createdAt: p.createdAt,
  }));

  return {
    producteur: name,
    productionCount: producerProds.length,
    avgCoutMinute:
      coutMinutes.length > 0 ? Math.round(avg(coutMinutes) * 100) / 100 : 0,
    dateRange: {
      first: sorted[0].createdAt,
      last: sorted[sorted.length - 1].createdAt,
    },
    avgStructure: computeStructure(producerProds),
    globalAvgStructure: computeStructure(filtered),
    ccAlerts,
    productions,
    history,
  };
}

/**
 * Cross-producer compliance matrix: avg daily rate by role per producer,
 * color-coded against CC minimums.
 */
export async function getComplianceMatrix(
  period?: Period,
  typeProduction?: string,
): Promise<{ roles: ComplianceMatrixRow[]; producers: string[] }> {
  const allProductions = await getAllProductionsFull();
  const filtered = filterByType(filterByPeriod(allProductions, period), typeProduction);

  const rateMap = new Map<string, Map<string, number[]>>();
  const allProducers = new Set<string>();

  for (const prod of filtered) {
    allProducers.add(prod.producteur);
    const grille = getGrilleCnc(prod);
    const postes = getPostes(grille);
    for (const poste of postes) {
      if (!poste.role_key || !isDailyRate(poste)) continue;
      if (!rateMap.has(poste.role_key)) rateMap.set(poste.role_key, new Map());
      const producerMap = rateMap.get(poste.role_key)!;
      if (!producerMap.has(prod.producteur)) producerMap.set(prod.producteur, []);
      producerMap.get(prod.producteur)!.push(poste.tarif_journalier);
    }
  }

  const producers = [...allProducers].sort();
  const roles: ComplianceMatrixRow[] = [];

  for (const [roleKey, producerMap] of rateMap) {
    const ccMin = getCcMinimum(roleKey);
    const producerEntries = producers.map((p) => {
      const rates = producerMap.get(p);
      if (!rates || rates.length === 0) {
        return { producteur: p, avgRate: 0, occurrences: 0, statut: "no_data" as const };
      }
      const avgRate = Math.round(avg(rates) * 100) / 100;
      const statut = ccMin != null && isNonConforme(avgRate, ccMin) ? "non_conforme" as const : "conforme" as const;
      return { producteur: p, avgRate, occurrences: rates.length, statut };
    });

    roles.push({ roleKey, label: getRoleLabel(roleKey), ccMinimum: ccMin, producers: producerEntries });
  }

  roles.sort(cncRoleSort);

  return { roles, producers };
}
