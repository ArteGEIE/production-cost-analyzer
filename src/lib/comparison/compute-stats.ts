import type { ProducerRankingRow } from "@/lib/db/queries-history";

export interface CategoryDeviation {
  current: number;
  reference: number;
  deviation: number;
  isOutlier: boolean;
}

/**
 * Computes relative deviation between current and average values.
 * Returns 0 when avg is 0 to avoid division by zero.
 */
export function computeDeviation(current: number, avg: number): number {
  if (avg === 0) return 0;
  return (current - avg) / avg;
}

/**
 * Computes per-category deviations between current and reference percentage structures.
 * Iterates over all keys present in either structure.
 * A category is flagged as outlier when |deviation| > 0.3.
 */
export function computeCategoryDeviations(
  currentStructure: Record<string, number>,
  referenceStructure: Record<string, number>
): Record<string, CategoryDeviation> {
  const keys = new Set([
    ...Object.keys(currentStructure),
    ...Object.keys(referenceStructure),
  ]);

  const result: Record<string, CategoryDeviation> = {};

  for (const key of keys) {
    const current = currentStructure[key] ?? 0;
    const reference = referenceStructure[key] ?? 0;
    const deviation = computeDeviation(current, reference);

    result[key] = {
      current,
      reference,
      deviation,
      isOutlier: Math.abs(deviation) > 0.3,
    };
  }

  return result;
}

/**
 * Returns the 1-based rank of a producer in a pre-sorted ranking list.
 * Returns -1 if the producer is not found.
 */
export function computeRank(
  ranking: ProducerRankingRow[],
  producteur: string
): number {
  const index = ranking.findIndex((row) => row.producteur === producteur);
  return index === -1 ? -1 : index + 1;
}

/**
 * Converts a grille CNC with absolute totals into a percentage structure
 * relative to totalDevis. Returns an empty object when totalDevis is 0.
 */
export function grilleToPctStructure(
  grilleCnc: Record<string, { total: number }>,
  totalDevis: number
): Record<string, number> {
  if (totalDevis === 0) return {};

  return Object.fromEntries(
    Object.entries(grilleCnc).map(([key, { total }]) => [
      key,
      total / totalDevis,
    ])
  );
}
