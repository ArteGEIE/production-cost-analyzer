import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db as defaultDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { DEFAULT_PRODUCTION_TYPES } from "@/lib/config/production-types";
import { DEFAULT_CNC_MAPPING, type CncRoleMapping } from "@/lib/config/cnc-mapping";
import {
  DEFAULT_STRUCTURAL_THRESHOLDS,
  DEFAULT_R6_MIN_RATE,
  DEFAULT_R7_MAX_DEVIATION,
  type StructuralThresholds,
} from "@/lib/config/structural-thresholds";
import { readConfigOverride } from "@/lib/config/config-dir";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, any>;

export interface ThresholdConfig {
  structural: StructuralThresholds;
  r6MinRate: number;
  r7MaxDeviation: number;
}

export async function getSetting(key: string, db: Db = defaultDb): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row[0]?.value ?? null;
}

export async function setSetting(key: string, value: string, db: Db = defaultDb): Promise<void> {
  const now = new Date().toISOString();
  // Upsert: try insert, on conflict update
  await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({
    target: settings.key,
    set: { value, updatedAt: now },
  });
}

/** Bundled defaults, or the APP_CONFIG_DIR override when present. */
function defaultProductionTypes(): string[] {
  return [...(readConfigOverride<{ types: string[] }>("production-types")?.types ?? DEFAULT_PRODUCTION_TYPES)];
}

function defaultCncMapping(): CncRoleMapping[] {
  return [...(readConfigOverride<{ mapping: CncRoleMapping[] }>("cnc-mapping")?.mapping ?? DEFAULT_CNC_MAPPING)];
}

function defaultThresholds(): ThresholdConfig {
  const override = readConfigOverride<{ structural: StructuralThresholds; r6MinRate: number; r7MaxDeviation: number }>("structural-thresholds");
  return {
    structural: override?.structural ?? DEFAULT_STRUCTURAL_THRESHOLDS,
    r6MinRate: override?.r6MinRate ?? DEFAULT_R6_MIN_RATE,
    r7MaxDeviation: override?.r7MaxDeviation ?? DEFAULT_R7_MAX_DEVIATION,
  };
}

export async function getProductionTypes(db: Db = defaultDb): Promise<string[]> {
  const json = await getSetting("production_types", db);
  return json ? JSON.parse(json) : defaultProductionTypes();
}

export async function setProductionTypes(types: string[], db: Db = defaultDb): Promise<void> {
  await setSetting("production_types", JSON.stringify(types), db);
}

export async function getCncMapping(db: Db = defaultDb): Promise<CncRoleMapping[]> {
  const json = await getSetting("cnc_mapping", db);
  return json ? JSON.parse(json) : defaultCncMapping();
}

export async function setCncMapping(mapping: CncRoleMapping[], db: Db = defaultDb): Promise<void> {
  await setSetting("cnc_mapping", JSON.stringify(mapping), db);
}

export async function getThresholdConfig(db: Db = defaultDb): Promise<ThresholdConfig> {
  const [structuralJson, r6Json, r7Json] = await Promise.all([
    getSetting("structural_thresholds", db),
    getSetting("r6_social_charges_min_rate", db),
    getSetting("r7_cost_minute_deviation", db),
  ]);

  const defaults = defaultThresholds();
  return {
    structural: structuralJson ? JSON.parse(structuralJson) : defaults.structural,
    r6MinRate: r6Json ? JSON.parse(r6Json) : defaults.r6MinRate,
    r7MaxDeviation: r7Json ? JSON.parse(r7Json) : defaults.r7MaxDeviation,
  };
}
