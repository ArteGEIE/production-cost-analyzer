/**
 * Runtime overrides for the JSON referentials in config/.
 *
 * Set APP_CONFIG_DIR to a directory (e.g. a Docker volume) holding any of
 * production-types.json, cnc-mapping.json, cc-minimums.json,
 * structural-thresholds.json — same shape as the files in config/. Files
 * present there replace the bundled defaults; missing files fall back to the
 * bundled ones. Read once per process: restart the app after editing.
 *
 * Server-only (uses fs). Values saved through the settings UI (DB) still take
 * precedence over both.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ConfigName = "production-types" | "cnc-mapping" | "cc-minimums" | "structural-thresholds";

const cache = new Map<string, unknown>();

export function readConfigOverride<T>(name: ConfigName, env: Record<string, string | undefined> = process.env): T | null {
  const dir = env.APP_CONFIG_DIR?.trim();
  if (!dir) return null;
  const cacheKey = `${dir}/${name}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T | null;

  const file = join(dir, `${name}.json`);
  let value: T | null = null;
  if (existsSync(file)) {
    try {
      value = JSON.parse(readFileSync(file, "utf8")) as T;
    } catch (err) {
      throw new Error(`Invalid JSON in ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  cache.set(cacheKey, value);
  return value;
}

/** Test helper: forget cached overrides. */
export function clearConfigOverrideCache(): void {
  cache.clear();
}
