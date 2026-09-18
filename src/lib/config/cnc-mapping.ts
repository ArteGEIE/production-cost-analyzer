/**
 * Job title mapping FR/DE/EN → CNC category + role key.
 * Used in the LLM prompt to help classify multilingual budget line items.
 *
 * Defaults come from config/cnc-mapping.json (override the whole file through
 * APP_CONFIG_DIR, see config-dir.ts). The authoritative runtime source is the
 * `settings` DB table (key: "cnc_mapping"), editable in the UI.
 */
import cncMappingConfig from "../../../config/cnc-mapping.json";

export interface CncRoleMapping {
  cnc_category: string;
  role_key: string;
  labels: { fr: string; de: string; en: string };
}

/** Default mapping — used when no DB config exists */
export const DEFAULT_CNC_MAPPING: CncRoleMapping[] = cncMappingConfig.mapping;

/** @deprecated Use getCncMapping() from queries-settings.ts */
export const cncMapping: readonly CncRoleMapping[] = DEFAULT_CNC_MAPPING;
