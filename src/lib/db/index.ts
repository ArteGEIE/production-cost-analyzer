import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    // max: 5 per process keeps a few replicas well under a small managed
    // Postgres connection limit (override via DATABASE_POOL_MAX). idle_timeout:
    // 30 because postgres.js defaults to 0, meaning idle connections are never
    // released.
    const max = Number(process.env.DATABASE_POOL_MAX) || 5;
    _db = drizzle(postgres(process.env.DATABASE_URL, { max, idle_timeout: 30 }), { schema });
  }
  return _db;
}

// Default export for convenience — lazy-initialized on first use
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as never)[prop];
  },
});
