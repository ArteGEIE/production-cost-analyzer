/**
 * Seed script: parse a "Conventions collectives" sheet from a history spreadsheet
 * (HISTORY_XLSM_PATH, default documents/history.xlsm) and insert all CC minimum
 * daily rates (CDDU, Base 8h) into the cc_minimums table.
 *
 * Most deployments should use `npm run db:seed:cc` (reads config/cc-minimums.json)
 * instead; this script exists for organisations maintaining the barème in a
 * spreadsheet.
 *
 * Usage: npm run db:seed:cc:xlsm
 *
 * Idempotent: deletes existing entries for "2025-01-01" before inserting.
 * Note: previous rate periods (2017-2024) from the old seed script are preserved.
 */

import * as XLSX from "xlsx";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { ccMinimums } from "../src/lib/db/schema";
import { consola } from "consola";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SPREADSHEET_PATH = process.env.HISTORY_XLSM_PATH ?? "documents/history.xlsm";
const SHEET_NAME = "Conventions collectives";
const EFFECTIVE_FROM = "2025-01-01";

// CDDU section: rows 13–134 (0-indexed), Base 8h is column index 6
const DATA_START_ROW = 13;
const DATA_END_ROW = 134;
const COL_EMPLOI = 0;
const COL_FILIERE = 1;
const COL_NIVEAU = 2;
const COL_BASE_8H = 6;

import { toRoleKey } from "./cc-utils";
// Re-export for backwards compatibility
export { toRoleKey };

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  consola.info(`Reading spreadsheet: ${SPREADSHEET_PATH}`);
  const workbook = XLSX.readFile(SPREADSHEET_PATH);

  const ws = workbook.Sheets[SHEET_NAME];
  if (!ws) {
    consola.error(`Sheet "${SHEET_NAME}" not found in workbook`);
    process.exit(1);
  }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (string | number | null)[][];

  // Parse CDDU Base 8h rows
  const roles: {
    roleKey: string;
    label: string;
    filiere: string | null;
    niveau: string | null;
    minimumDaily: number;
  }[] = [];

  for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
    const row = data[r];
    if (!row) continue;

    const rawLabel = row[COL_EMPLOI];
    const filiere = row[COL_FILIERE];
    const niveau = row[COL_NIVEAU];
    const base8h = row[COL_BASE_8H];

    if (!rawLabel || typeof rawLabel !== "string") continue;
    if (!base8h || typeof base8h !== "number") continue;

    const label = rawLabel.trim();
    const roleKey = toRoleKey(label);

    roles.push({
      roleKey,
      label,
      filiere: typeof filiere === "string" ? filiere.trim() || null : null,
      niveau: typeof niveau === "string" ? niveau.trim() || null : null,
      minimumDaily: Math.round(base8h * 100) / 100,
    });
  }

  consola.info(`Parsed ${roles.length} CC roles from spreadsheet`);

  // Connect to DB
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Idempotent: delete existing entries for this effective date only
  await db.delete(ccMinimums).where(eq(ccMinimums.effectiveFrom, EFFECTIVE_FROM));
  consola.info(`Cleared existing CC minimums for ${EFFECTIVE_FROM}`);

  // Insert all roles
  await db.insert(ccMinimums).values(
    roles.map((r) => ({
      roleKey: r.roleKey,
      label: r.label,
      filiere: r.filiere,
      niveau: r.niveau,
      minimumDaily: r.minimumDaily,
      effectiveFrom: EFFECTIVE_FROM,
    })),
  );

  consola.success(`Inserted ${roles.length} CC minimum rates (effective ${EFFECTIVE_FROM})`);

  // Print sample rows for verification
  consola.info("Sample (first 3):");
  for (const r of roles.slice(0, 3)) {
    console.log(`  ${r.roleKey}: ${r.label} = ${r.minimumDaily} €/j`);
  }
  consola.info("Sample (last 3):");
  for (const r of roles.slice(-3)) {
    console.log(`  ${r.roleKey}: ${r.label} = ${r.minimumDaily} €/j`);
  }

  await client.end();
}

main().catch((err) => {
  consola.error(err);
  process.exit(1);
});
