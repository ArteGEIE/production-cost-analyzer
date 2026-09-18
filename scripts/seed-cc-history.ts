/**
 * Seed script: import historical CC minimum daily rates (CDDU, Cat B, Hors fiction & flux, Base 8h)
 * for all effective periods from 2021 to 2026.
 *
 * Data sources:
 * - Jul 2025 & Jan 2025: USPA official Excel files (downloaded from uspa.fr)
 * - 2023 (post-Avenant 14): computed by reversing Avenant 17 (+5%/+3%) from Jan 2025 rates
 * - 2021 (pre-Avenant 14): computed by reversing Avenant 14 (+2.5%/+1.5%) from 2023 rates
 * - 2020–2022 were a salary freeze (same rates as Avenant 11, Oct 2019)
 *
 * Avenant history (Cat B CDDU, Hors fiction & flux):
 *   Avenant 11 (Oct 2019): baseline
 *   2020–2022: 0% freeze
 *   Avenant 14 (Jan 2023): +2.5% (weekly ≤ 1000€) / +1.5% (weekly > 1000€)
 *   Avenant 17 (Feb 2024): +5% (weekly ≤ 1100€) / +3% (weekly > 1100€)
 *   Avenant 19 (Jul 2025 for hors fiction): +1% flat
 *   Jan 2026: no CDDU change (SMIC floor only affects CDI/CDD monthly)
 *
 * Usage: npx tsx scripts/seed-cc-history.ts
 * Requires: node --env-file=.env
 *
 * Idempotent: deletes existing entries for each effective date before inserting.
 */

import * as XLSX from "xlsx";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inArray } from "drizzle-orm";
import { ccMinimums } from "../src/lib/db/schema";
import { toRoleKey } from "./cc-utils";
import { consola } from "consola";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const USPA_JAN2025_PATH = "/tmp/uspa-jan2025.xlsx";
const USPA_JUL2025_PATH = "/tmp/uspa-jul2025.xlsx";
const SHEET_NAME_JAN2025 = "CAT B - Hors fiction & flux";
const SHEET_NAME_JUL2025 = "CAT B - Hors fiction & flux";

// Column indices for USPA files
const COL_EMPLOI = 0;
const COL_FILIERE = 1;
const COL_NIVEAU = 2;
const COL_BASE_8H = 6; // "Base 8h" daily rate column

// Effective dates we'll insert
const EFFECTIVE_DATES = [
  "2021-01-01", // = Avenant 11 (freeze since Oct 2019)
  "2022-01-01", // = same (freeze)
  "2023-01-01", // Avenant 14
  "2024-02-01", // Avenant 17
  "2025-01-01", // = same as Avenant 17 (no CDDU hors fiction change until Jul)
  "2025-07-01", // Avenant 19 (+1% flat)
  "2026-01-01", // = same as Jul 2025 (SMIC floor only, no CDDU impact)
];

// ---------------------------------------------------------------------------
// Parse USPA Excel
// ---------------------------------------------------------------------------

interface ParsedRole {
  label: string;
  filiere: string | null;
  niveau: string | null;
  base8h: number;
}

function parseUSPASheet(path: string, sheetName: string, dataStartRow: number): ParsedRole[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${path}`);

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (string | number | null)[][];
  const roles: ParsedRole[] = [];

  for (let r = dataStartRow; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    const rawLabel = row[COL_EMPLOI];
    const filiere = row[COL_FILIERE];
    const niveau = row[COL_NIVEAU];
    const base8h = row[COL_BASE_8H];

    if (!rawLabel || typeof rawLabel !== "string") continue;
    if (!base8h || typeof base8h !== "number") continue;

    roles.push({
      label: rawLabel.trim(),
      filiere: typeof filiere === "string" ? filiere.trim() || null : null,
      niveau: typeof niveau === "string" ? niveau.trim() || null : null,
      base8h: Math.round(base8h * 100) / 100,
    });
  }

  return roles;
}

// ---------------------------------------------------------------------------
// Compute historical rates by reversing avenants
// ---------------------------------------------------------------------------

function reverseAvenant17(postRate: number): number {
  // Avenant 17: +5% if pre-increase weekly <= 1100, else +3%
  const preIfLow = postRate / 1.05;
  if (preIfLow * 5 <= 1100) return preIfLow;
  return postRate / 1.03;
}

function reverseAvenant14(postRate: number): number {
  // Avenant 14: +2.5% if pre-increase weekly <= 1000, else +1.5%
  const preIfLow = postRate / 1.025;
  if (preIfLow * 5 <= 1000) return preIfLow;
  return postRate / 1.015;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse USPA files
  consola.info("Parsing USPA Jan 2025 file...");
  const jan2025Roles = parseUSPASheet(USPA_JAN2025_PATH, SHEET_NAME_JAN2025, 9);
  consola.info(`  → ${jan2025Roles.length} roles`);

  consola.info("Parsing USPA Jul 2025 file...");
  const jul2025Roles = parseUSPASheet(USPA_JUL2025_PATH, SHEET_NAME_JUL2025, 11);
  consola.info(`  → ${jul2025Roles.length} roles`);

  // Build rate grid for all effective dates
  // Use Jan 2025 (= post-Avenant 17) as anchor, compute backwards
  const allInserts: {
    roleKey: string;
    label: string;
    filiere: string | null;
    niveau: string | null;
    minimumDaily: number;
    effectiveFrom: string;
  }[] = [];

  // Build Jul 2025 lookup for cross-check
  const jul2025Map = new Map(jul2025Roles.map((r) => [r.label, r.base8h]));

  for (const role of jan2025Roles) {
    const roleKey = toRoleKey(role.label);
    const postAv17 = role.base8h; // Jan 2025 = post-Avenant 17

    // Reverse to get prior period rates
    const postAv14 = round2(reverseAvenant17(postAv17)); // 2023 rate
    const preAv14 = round2(reverseAvenant14(postAv14));   // 2021-2022 rate (= Avenant 11)

    // Jul 2025 from USPA file (prefer actual over computed)
    const jul2025Rate = jul2025Map.get(role.label);
    const postAv19 = jul2025Rate ? round2(jul2025Rate) : round2(postAv17 * 1.01);

    const ratesByDate: Record<string, number> = {
      "2021-01-01": preAv14,
      "2022-01-01": preAv14,       // freeze
      "2023-01-01": postAv14,      // Avenant 14
      "2024-02-01": postAv17,      // Avenant 17
      "2025-01-01": postAv17,      // no change for CDDU hors fiction
      "2025-07-01": postAv19,      // Avenant 19
      "2026-01-01": postAv19,      // no change for CDDU
    };

    for (const effectiveFrom of EFFECTIVE_DATES) {
      allInserts.push({
        roleKey,
        label: role.label,
        filiere: role.filiere,
        niveau: role.niveau,
        minimumDaily: ratesByDate[effectiveFrom],
        effectiveFrom,
      });
    }
  }

  consola.info(`Prepared ${allInserts.length} rows (${jan2025Roles.length} roles × ${EFFECTIVE_DATES.length} periods)`);

  // Connect to DB
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Idempotent: delete existing entries for all target effective dates
  await db.delete(ccMinimums).where(inArray(ccMinimums.effectiveFrom, EFFECTIVE_DATES));
  consola.info(`Cleared existing CC minimums for: ${EFFECTIVE_DATES.join(", ")}`);

  // Insert in batches (Postgres has a parameter limit)
  const BATCH_SIZE = 200;
  for (let i = 0; i < allInserts.length; i += BATCH_SIZE) {
    const batch = allInserts.slice(i, i + BATCH_SIZE);
    await db.insert(ccMinimums).values(batch);
  }

  consola.success(`Inserted ${allInserts.length} CC minimum rates across ${EFFECTIVE_DATES.length} periods`);

  // Print summary
  consola.info("\nSummary by period:");
  for (const date of EFFECTIVE_DATES) {
    const rows = allInserts.filter((r) => r.effectiveFrom === date);
    const sample = rows.find((r) => r.roleKey === "directeur_de_production");
    consola.info(`  ${date}: ${rows.length} roles — Dir. prod: ${sample?.minimumDaily} €/j`);
  }

  // Print a few roles across all periods
  consola.info("\nRate evolution for key roles:");
  const keyRoles = ["directeur_de_production", "chef_monteur", "cadreur_opv", "assistant_de_production", "aide_de_plateau"];
  for (const key of keyRoles) {
    const rows = allInserts.filter((r) => r.roleKey === key);
    const line = rows.map((r) => `${r.effectiveFrom.slice(0, 4)}=${r.minimumDaily}`).join("  ");
    consola.info(`  ${key}: ${line}`);
  }

  await client.end();
}

main().catch((err) => {
  consola.error(err);
  process.exit(1);
});
