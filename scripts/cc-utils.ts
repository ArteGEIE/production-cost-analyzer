/**
 * Shared utilities for CC seed scripts.
 */

/**
 * Generate a role_key from a French job title label.
 * - Strip footnote numbers like (17), (5), etc.
 * - Strip leading asterisks used for footnote markers
 * - Lowercase
 * - Remove accents (é→e, è→e, etc.)
 * - Replace non-alphanumeric chars with underscores
 * - Collapse multiple underscores
 * - Trim leading/trailing underscores
 *
 * Examples:
 *   "Chef OPS / Ingénieur du son"  → "chef_ops_ingenieur_du_son"
 *   "Assistant d'émission (17)"    → "assistant_d_emission"
 *   "*Cadreur / OPV (10)"          → "cadreur_opv"
 */
export function toRoleKey(label: string): string {
  return label
    .replace(/\s*\(\d+\)\s*/g, " ") // strip footnote numbers like (17)
    .replace(/^\*+/, "")             // strip leading asterisks
    .toLowerCase()
    .normalize("NFD")                // decompose accents
    .replace(/[\u0300-\u036f]/g, "") // remove combining diacritics
    .replace(/[^a-z0-9]+/g, "_")    // non-alphanumeric → underscore
    .replace(/_+/g, "_")            // collapse multiple underscores
    .replace(/^_|_$/g, "");          // trim leading/trailing underscores
}
