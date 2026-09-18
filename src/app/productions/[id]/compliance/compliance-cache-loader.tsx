"use client";

import { QualitativeAnalysis } from "@/components/compliance/qualitative-analysis";
import type { DevisExtraction } from "@/lib/schemas/devis";

interface ComplianceCacheLoaderProps {
  extraction: DevisExtraction;
  productionId: number;
  cachedAnalysis: string | null;
}

/**
 * Client wrapper to render QualitativeAnalysis with server-loaded cached analysis.
 * Avoids an extra API call since we already have the data from the DB.
 */
export function ComplianceCacheLoader({
  extraction,
  productionId,
  cachedAnalysis,
}: ComplianceCacheLoaderProps) {
  return (
    <QualitativeAnalysis
      extraction={extraction}
      productionId={productionId}
      cachedAnalysis={cachedAnalysis}
    />
  );
}
