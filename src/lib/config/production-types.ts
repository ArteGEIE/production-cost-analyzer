/**
 * Production types recognized by the application.
 *
 * Defaults come from config/production-types.json (override the whole file
 * through APP_CONFIG_DIR, see config-dir.ts). The authoritative runtime source
 * is the `settings` DB table (key: "production_types"), editable in the UI.
 */
import productionTypesConfig from "../../../config/production-types.json";

export const DEFAULT_PRODUCTION_TYPES: readonly string[] = productionTypesConfig.types;

/** @deprecated Use getProductionTypes() from queries-settings.ts */
export const productionTypes = DEFAULT_PRODUCTION_TYPES;
export type ProductionType = string;
