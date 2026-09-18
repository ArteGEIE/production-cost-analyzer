/**
 * Structural thresholds for CNC category proportions (R3/R4 rules) and the
 * R6/R7 ratios. Each category has a low/high percentage range considered
 * "normal". Values are fractions (e.g. 0.02 = 2%).
 *
 * Defaults come from config/structural-thresholds.json (override the whole
 * file through APP_CONFIG_DIR, see config-dir.ts). The authoritative runtime
 * source is the `settings` DB table, editable in the UI.
 */
import thresholdsConfig from "../../../config/structural-thresholds.json";

export type StructuralThresholds = Record<string, { low: number; high: number; label: string }>;

export const DEFAULT_STRUCTURAL_THRESHOLDS: StructuralThresholds = thresholdsConfig.structural;
export const DEFAULT_R6_MIN_RATE: number = thresholdsConfig.r6MinRate;
export const DEFAULT_R7_MAX_DEVIATION: number = thresholdsConfig.r7MaxDeviation;

/** @deprecated Use DEFAULT_STRUCTURAL_THRESHOLDS instead */
export const structuralThresholds = DEFAULT_STRUCTURAL_THRESHOLDS;
