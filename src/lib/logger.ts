import { createConsola, type LogLevel } from "consola";

/**
 * Application logger.
 *
 * Log level is controlled via LOG_LEVEL env var:
 *   - "debug" (verbose, default in dev)
 *   - "info"
 *   - "warn"
 *   - "error"
 *   - "silent"
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.debug("PDF parsed", { pages: 3 });
 *   log.info("Extraction complete", { total: 86437 });
 *   log.warn("Low confidence extraction");
 *   log.error("LLM request failed", err);
 */

const levelMap: Record<string, LogLevel> = {
  silent: -1,
  error: 0,
  warn: 1,
  info: 3,
  debug: 4,
  trace: 5,
};

const envLevel = process.env.LOG_LEVEL?.toLowerCase() ?? "";
const isDev = process.env.NODE_ENV !== "production";
const level = levelMap[envLevel] ?? (isDev ? levelMap.debug : levelMap.info);

export const log = createConsola({ level });
