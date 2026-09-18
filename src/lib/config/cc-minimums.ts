/**
 * CC Minimums — type definitions and fallback constants.
 *
 * The authoritative source is the `cc_minimums` DB table (seed it with
 * `npm run db:seed:cc`). These fallback values are used only when the table is
 * empty. They come from config/cc-minimums.json (override the whole file
 * through APP_CONFIG_DIR, see config-dir.ts).
 *
 * Shipped barème: CDDU, Catégorie B, Hors fiction & flux, Base 8h — a public
 * reference. Replace the JSON with your own collective agreement if needed.
 */
import ccMinimumsConfig from "../../../config/cc-minimums.json";

/** Shape consumed by anomaly-engine, extraction-prompt, and UI components */
export type CcRates = Record<string, { label: string; minimum: number }>;

/** Effective date of the shipped fallback grid. */
export const CC_FALLBACK_EFFECTIVE_FROM: string = ccMinimumsConfig.effectiveFrom;

/** Fallback rates — used only when DB table is empty. */
export const CC_FALLBACK_RATES: CcRates = ccMinimumsConfig.rates;
