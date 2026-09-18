/**
 * Seed script: load the collective-agreement minimums shipped in
 * config/cc-minimums.json (or APP_CONFIG_DIR/cc-minimums.json when set) into
 * the cc_minimums table.
 *
 * Usage: npm run db:seed:cc
 *
 * Idempotent: deletes existing entries for the file's effectiveFrom date
 * before inserting. Other rate periods are preserved.
 *
 * To import a barème from a spreadsheet instead, see seed-cc-minimums.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { consola } from "consola";
import { ccMinimums } from "../src/lib/db/schema";

interface CcMinimumsFile {
  effectiveFrom: string;
  rates: Record<string, { label: string; minimum: number; filiere?: string; niveau?: string }>;
}

function resolveConfigPath(): string {
  const dir = process.env.APP_CONFIG_DIR?.trim();
  if (dir && existsSync(join(dir, "cc-minimums.json"))) return join(dir, "cc-minimums.json");
  return "config/cc-minimums.json";
}

async function main() {
  const path = resolveConfigPath();
  consola.info(`Reading ${path}`);
  const file = JSON.parse(readFileSync(path, "utf8")) as CcMinimumsFile;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(file.effectiveFrom)) {
    throw new Error(`effectiveFrom must be YYYY-MM-DD, got "${file.effectiveFrom}"`);
  }
  const rows = Object.entries(file.rates).map(([roleKey, r]) => ({
    roleKey,
    label: r.label,
    filiere: r.filiere ?? null,
    niveau: r.niveau ?? null,
    minimumDaily: r.minimum,
    effectiveFrom: file.effectiveFrom,
  }));
  if (rows.length === 0) throw new Error("No rates found in the config file");

  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  await db.delete(ccMinimums).where(eq(ccMinimums.effectiveFrom, file.effectiveFrom));
  await db.insert(ccMinimums).values(rows);
  consola.success(`Inserted ${rows.length} CC minimum rates (effective ${file.effectiveFrom})`);

  await client.end();
}

main().catch((err) => {
  consola.error(err);
  process.exit(1);
});
