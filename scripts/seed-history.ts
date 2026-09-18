/**
 * Seed script: parse an organisation's history spreadsheet (HISTORY_XLSM_PATH,
 * default documents/history.xlsm — the documents/ folder is gitignored) and
 * insert historical productions into the database.
 *
 * Usage: npm run db:seed:xlsm
 *
 * The expected sheet layout is documented in parse-history-xlsm.ts. To try the
 * app without your own data, use `npm run db:seed:demo` (demo-data/history.json).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { consola } from "consola";
import { productions } from "../src/lib/db/schema";
import { parseAllProductions } from "./parse-history-xlsm";

const SPREADSHEET_PATH = process.env.HISTORY_XLSM_PATH ?? "documents/history.xlsm";

async function main() {
  consola.info(`Reading spreadsheet: ${SPREADSHEET_PATH}`);
  const records = parseAllProductions(SPREADSHEET_PATH);

  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  await db.delete(productions).where(eq(productions.formatSource, "seed-history"));
  consola.info("Cleared existing seed-history productions");

  let totalPostes = 0;
  let totalVerif = 0;

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
    const grille = record.grilleCnc as { "2_personnel"?: { postes?: unknown[] } };
    totalPostes += grille["2_personnel"]?.postes?.length ?? 0;
    totalVerif += (record.verificationMinima as unknown[]).length;
  }

  consola.box(
    `Total: ${records.length} productions seeded\n` +
      `Personnel postes: ${totalPostes}\n` +
      `Verification minima entries: ${totalVerif}`,
  );
  await client.end();
}

main();
