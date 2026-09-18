/**
 * Seed script (open-source): load the committed demo dataset into the database.
 *
 * Usage: npm run db:seed:demo
 *
 * Reads demo-data/history.json (entirely fictional data) and inserts each
 * production. Idempotent: rows tagged formatSource='seed-demo' are deleted and
 * re-inserted on every run.
 *
 * To replace with your own data, either:
 *   - edit demo-data/history.json directly (same shape), or
 *   - write your own seed script following this template.
 */

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { consola } from "consola";
import { productions } from "../src/lib/db/schema";

const DATASET_PATH = "demo-data/history.json";

interface DemoProduction {
  producteur: string;
  titre: string;
  dureeMinutes: number;
  typeProduction: string;
  totalDevis: number;
  coutMinute: number;
  confiance: "haute" | "moyenne" | "basse";
  grilleCnc: unknown;
  meta: unknown;
  verificationMinima: unknown;
  anomalies: unknown;
  postesNonClasses: unknown;
  dateDevis: string | null;
  formatSource: string;
  cncFunding: boolean;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    consola.error("DATABASE_URL is not set. Run with `npm run db:seed:demo`.");
    process.exit(1);
  }

  consola.info(`Reading demo dataset: ${DATASET_PATH}`);
  const raw = readFileSync(DATASET_PATH, "utf8");
  const records = JSON.parse(raw) as DemoProduction[];
  consola.info(`Loaded ${records.length} fictional productions`);

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  await db.delete(productions).where(eq(productions.formatSource, "seed-demo"));
  consola.info("Cleared existing seed-demo productions");

  for (const record of records) {
    await db.insert(productions).values({
      producteur: record.producteur,
      titre: record.titre,
      dureeMinutes: record.dureeMinutes,
      typeProduction: record.typeProduction,
      totalDevis: record.totalDevis,
      coutMinute: record.coutMinute,
      confiance: record.confiance,
      grilleCnc: record.grilleCnc,
      meta: record.meta,
      dateDevis: record.dateDevis,
      verificationMinima: record.verificationMinima,
      anomalies: record.anomalies,
      postesNonClasses: record.postesNonClasses,
      formatSource: record.formatSource,
      cncFunding: record.cncFunding,
    });
  }

  const producers = Array.from(new Set(records.map((r) => r.producteur)));
  consola.box(
    `Total: ${records.length} demo productions seeded\n` +
      `Producers: ${producers.length} (${producers.join(", ")})`,
  );
  await client.end();
}

main();
