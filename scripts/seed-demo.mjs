// Plain-JS demo/CC seeder for the deployed container (the standalone image ships
// neither tsx nor the TypeScript sources). Uses postgres.js directly — no
// drizzle schema — so it only depends on scripts/node_modules like migrate.mjs.
//
// Usage inside the image:  node scripts/seed-demo.mjs
// Idempotent: rows tagged format_source='seed-demo' and the CC period shipped in
// config/cc-minimums.json are replaced on every run.
//
// For local development prefer `npm run db:seed:demo` / `npm run db:seed:cc`.
import { readFileSync } from "node:fs";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("[seed-demo] DATABASE_URL is not set — refusing to run.");
  process.exit(1);
}

const DATASET_PATH = process.env.DEMO_DATASET_PATH ?? "demo-data/history.json";
const CC_PATH = process.env.CC_MINIMUMS_PATH ?? "config/cc-minimums.json";

let sql;
try {
  sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const records = JSON.parse(readFileSync(DATASET_PATH, "utf8"));
  await sql`delete from productions where format_source = 'seed-demo'`;
  for (const r of records) {
    await sql`
      insert into productions (
        producteur, titre, duree_minutes, type_production, total_devis, cout_minute,
        confiance, grille_cnc, meta, date_devis, verification_minima, anomalies,
        postes_non_classes, format_source, cnc_funding, status, created_at
      ) values (
        ${r.producteur}, ${r.titre}, ${r.dureeMinutes}, ${r.typeProduction}, ${r.totalDevis},
        ${r.coutMinute}, ${r.confiance}, ${sql.json(r.grilleCnc)}, ${sql.json(r.meta)},
        ${r.dateDevis ?? null}, ${sql.json(r.verificationMinima)}, ${sql.json(r.anomalies)},
        ${sql.json(r.postesNonClasses)}, 'seed-demo', ${Boolean(r.cncFunding)}, 'published',
        ${new Date().toISOString()}
      )`;
  }
  console.log(`[seed-demo] ${records.length} demo productions seeded`);

  const cc = JSON.parse(readFileSync(CC_PATH, "utf8"));
  const rows = Object.entries(cc.rates).map(([roleKey, v]) => ({
    role_key: roleKey,
    label: v.label,
    filiere: v.filiere ?? null,
    niveau: v.niveau ?? null,
    minimum_daily: v.minimum,
    effective_from: cc.effectiveFrom,
    created_at: new Date().toISOString(),
  }));
  await sql`delete from cc_minimums where effective_from = ${cc.effectiveFrom}`;
  await sql`insert into cc_minimums ${sql(rows)}`;
  console.log(`[seed-demo] ${rows.length} CC minimums seeded (effective ${cc.effectiveFrom})`);

  await sql.end();
  process.exit(0);
} catch (err) {
  console.error("[seed-demo] failed:", err);
  if (sql) await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
}
