/**
 * In-memory PostgreSQL for tests using PGlite.
 * Usage: const { db, cleanup } = await createTestDb();
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";

import * as schema from "./schema";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // Create tables from schema
  await db.execute(sql`
    CREATE TABLE productions (
      id SERIAL PRIMARY KEY,
      producteur VARCHAR(255) NOT NULL,
      titre VARCHAR(255) NOT NULL,
      duree_minutes INTEGER,
      type_production VARCHAR(255),
      total_devis DOUBLE PRECISION,
      cout_minute DOUBLE PRECISION,
      confiance VARCHAR(50),
      diffuseur VARCHAR(255),
      lieu_tournage VARCHAR(255),
      grille_cnc JSONB,
      meta JSONB,
      verification_minima JSONB,
      anomalies JSONB,
      postes_non_classes JSONB,
      qualitative_analysis TEXT,
      date_devis VARCHAR(20),
      format_source VARCHAR(50),
      file_hash VARCHAR(64),
      cnc_funding BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      user_id VARCHAR(255),
      user_name VARCHAR(255),
      created_at VARCHAR(30) NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `);

  await db.execute(sql`
    CREATE TABLE production_files (
      id SERIAL PRIMARY KEY,
      production_id INTEGER NOT NULL UNIQUE REFERENCES productions(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      data BYTEA NOT NULL,
      created_at VARCHAR(30) NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `);

  await db.execute(sql`
    CREATE TABLE cc_minimums (
      id SERIAL PRIMARY KEY,
      role_key VARCHAR(100) NOT NULL,
      label VARCHAR(255) NOT NULL,
      filiere VARCHAR(100),
      niveau VARCHAR(100),
      minimum_daily DOUBLE PRECISION NOT NULL,
      effective_from VARCHAR(20) NOT NULL,
      created_at VARCHAR(30) NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX idx_cc_minimums_unique ON cc_minimums (role_key, effective_from)
  `);

  await db.execute(sql`
    CREATE TABLE settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at VARCHAR(30) NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `);

  return { db, client };
}
