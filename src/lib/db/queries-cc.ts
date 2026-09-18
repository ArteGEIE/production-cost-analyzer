import { desc, lte } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db as defaultDb } from "@/lib/db";
import { ccMinimums as ccTable } from "@/lib/db/schema";
import { CC_FALLBACK_RATES, type CcRates } from "@/lib/config/cc-minimums";
import { readConfigOverride } from "@/lib/config/config-dir";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, any>;

/** Normalize a date string to YYYY-MM-DD for comparison. Handles "YYYY", "YYYY-MM", "YYYY-MM-DD". */
function normalizeDateForLookup(date: string): string {
  if (/^\d{4}$/.test(date)) return `${date}-12-31`;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-28`; // end of shortest month, safe for <= comparison
  return date;
}

/**
 * Get CC minimum rates effective at a given date.
 * For each role_key, returns the most recent rate where effective_from <= date.
 * If no date is provided, returns the latest rates.
 * Falls back to CC_FALLBACK_RATES if table is empty.
 */
export async function getCcMinimums(date?: string, db: Db = defaultDb): Promise<CcRates> {
  const dateFilter = date ? normalizeDateForLookup(date) : "9999-12-31";

  const rows = await db
    .select()
    .from(ccTable)
    .where(lte(ccTable.effectiveFrom, dateFilter))
    .orderBy(desc(ccTable.effectiveFrom));

  if (rows.length === 0) {
    // Check if table is truly empty vs just no rows for requested date
    const anyRows = await db.select({ id: ccTable.id }).from(ccTable).limit(1);
    if (anyRows.length === 0) {
      return readConfigOverride<{ rates: CcRates }>("cc-minimums")?.rates ?? CC_FALLBACK_RATES;
    }
    // Table has data but nothing before the requested date — return empty
    return {};
  }

  // Keep only the most recent rate per role_key
  const latest = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    if (!latest.has(row.roleKey)) {
      latest.set(row.roleKey, row);
    }
  }

  const rates: CcRates = {};
  for (const [key, row] of latest) {
    rates[key] = { label: row.label, minimum: row.minimumDaily };
  }

  return rates;
}

/**
 * Get the effective_from date of the CC rates that apply for a given date.
 * Returns null if no rates found.
 */
export async function getCcEffectiveDate(date?: string, db: Db = defaultDb): Promise<string | null> {
  const dateFilter = date ? normalizeDateForLookup(date) : "9999-12-31";

  const row = await db
    .select({ effectiveFrom: ccTable.effectiveFrom })
    .from(ccTable)
    .where(lte(ccTable.effectiveFrom, dateFilter))
    .orderBy(desc(ccTable.effectiveFrom))
    .limit(1);

  return row[0]?.effectiveFrom ?? null;
}

/**
 * Get all rate periods grouped by effective_from date.
 * Used by the settings history panel.
 */
export async function getAllCcRatePeriods(db: Db = defaultDb) {
  const rows = await db
    .select()
    .from(ccTable)
    .orderBy(desc(ccTable.effectiveFrom), ccTable.roleKey);

  const periods = new Map<string, { roleKey: string; label: string; minimumDaily: number; filiere: string | null; niveau: string | null }[]>();
  for (const row of rows) {
    const list = periods.get(row.effectiveFrom) ?? [];
    list.push({ roleKey: row.roleKey, label: row.label, minimumDaily: row.minimumDaily, filiere: row.filiere, niveau: row.niveau });
    periods.set(row.effectiveFrom, list);
  }

  return periods;
}

/**
 * Insert a complete rate period (all roles at a given effective_from date).
 */
export async function insertCcRatePeriod(
  effectiveFrom: string,
  rates: { roleKey: string; label: string; minimumDaily: number; filiere?: string; niveau?: string }[],
  db: Db = defaultDb,
) {
  await db.insert(ccTable).values(
    rates.map((r) => ({
      roleKey: r.roleKey,
      label: r.label,
      filiere: r.filiere ?? null,
      niveau: r.niveau ?? null,
      minimumDaily: r.minimumDaily,
      effectiveFrom,
    })),
  );
}
