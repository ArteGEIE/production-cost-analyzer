import type { GrilleCnc, PersonnelLine } from "@/lib/schemas/devis";
import { cncGrid } from "@/lib/config/cnc-grid";

/**
 * Get the total for a single CNC category.
 * All categories are now objects with a `total` field.
 */
export function calculateCategoryTotal(
  value: { total: number } | undefined,
): number {
  if (value == null) return 0;
  return value.total ?? 0;
}

/**
 * Sum all 10 CNC category totals.
 */
export function calculateTotalDevis(grilleCnc: GrilleCnc): number {
  return cncGrid.reduce((sum, cat) => {
    const value = grilleCnc[cat.key as keyof GrilleCnc];
    return sum + calculateCategoryTotal(value as { total: number });
  }, 0);
}

/**
 * Cost per minute = total / duration.
 */
export function calculateCoutMinute(
  total: number,
  dureeMinutes: number,
): number {
  if (dureeMinutes <= 0) return 0;
  return Math.round((total / dureeMinutes) * 100) / 100;
}

/**
 * Recalculate a personnel line total from days × daily rate.
 */
export function recalculatePersonnelLineTotal(
  line: Pick<PersonnelLine, "nombre_jours" | "tarif_journalier">,
): number {
  return line.nombre_jours * line.tarif_journalier;
}
