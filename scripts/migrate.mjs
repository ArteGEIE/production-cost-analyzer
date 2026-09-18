// Standalone migration runner for the deployed container. Invoked by the Helm
// post-install/pre-upgrade hook Job (see
// .infrastructure/helm/app/templates/migrate-job.yaml, which explains why the
// install side is post- rather than pre-). On an upgrade the schema is current
// before the new pods roll out.
//
// Plain .mjs on purpose: the Next standalone image ships neither tsx nor the
// TypeScript sources, and drizzle-kit is a devDependency. drizzle-orm is not
// resolvable from the standalone node_modules (Turbopack inlines it into the
// route chunks), so the Dockerfile's migrate-deps stage installs drizzle-orm +
// postgres into scripts/node_modules beside this file. DATABASE_URL comes from
// the injected Kubernetes secret — no dotenv here.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set — refusing to run.");
  process.exit(1);
}

// Constructed inside the try: a malformed DSN makes postgres() throw
// synchronously, and outside the try that surfaces as a bare stack trace with no
// `[migrate] failed:` marker — harder to spot in a Helm hook Job's logs.
// `sql` stays in outer scope so the catch can close it only if it was created.
let sql;

try {
  // max: 1 — a migration runner needs exactly one connection, and the shared
  // instance has a limited connection budget.
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[migrate] migrations applied");
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error("[migrate] failed:", err);
  if (sql) await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
}
