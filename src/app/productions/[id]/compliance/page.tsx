import { getProductionById } from "@/lib/db/queries";
import { getProductionsByProducteur } from "@/lib/db/queries-history";
import { getCcMinimums, getCcEffectiveDate } from "@/lib/db/queries-cc";
import { getThresholdConfig } from "@/lib/db/queries-settings";
import { computeCompliance } from "@/lib/anomalies/anomaly-engine";
import { SummaryCard } from "@/components/compliance/summary-card";
import { CcMinimaTable } from "@/components/compliance/cc-minima-table";
import { CcSection } from "@/components/compliance/cc-section";
import { StructuralSection } from "@/components/compliance/structural-section";
import { QualitativeAnalysis } from "@/components/compliance/qualitative-analysis";
import { ComplianceCacheLoader } from "./compliance-cache-loader";
import type { DevisExtraction } from "@/lib/schemas/devis";
import { notFound } from "next/navigation";

/**
 * Reconstruct a DevisExtraction object from a DB production row.
 */
function toDevisExtraction(row: NonNullable<Awaited<ReturnType<typeof getProductionById>>>): DevisExtraction {
  return {
    meta: row.meta as DevisExtraction["meta"],
    grille_cnc: row.grilleCnc as DevisExtraction["grille_cnc"],
    total_devis: row.totalDevis ?? 0,
    cout_minute: row.coutMinute ?? 0,
    verification_minima: (row.verificationMinima ?? []) as DevisExtraction["verification_minima"],
    anomalies: (row.anomalies ?? []) as DevisExtraction["anomalies"],
    postes_non_classes: (row.postesNonClasses ?? []) as DevisExtraction["postes_non_classes"],
    confiance: (row.confiance as DevisExtraction["confiance"]) ?? "basse",
  };
}

export default async function CompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const production = await getProductionById(Number(id));
  if (!production) notFound();

  const extraction = toDevisExtraction(production);

  // Compute producer history for R7 (exclude current production to avoid self-bias)
  const producerProductions = await getProductionsByProducteur(production.producteur);
  const producerHistory = producerProductions
    .filter((p) => p.id !== production.id && p.coutMinute != null)
    .map((p) => p.coutMinute!);

  const devisDate = production.dateDevis ?? undefined;
  const [ccRates, ccEffectiveDate, thresholds] = await Promise.all([
    getCcMinimums(devisDate),
    getCcEffectiveDate(devisDate),
    getThresholdConfig(),
  ]);
  const compliance = computeCompliance(extraction, ccRates, thresholds, producerHistory);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-6">
        <SummaryCard anomalies={compliance.anomalies} />
        <CcMinimaTable verificationMinima={compliance.verificationMinima} ccEffectiveDate={ccEffectiveDate} />
        <CcSection anomalies={compliance.anomalies} />
        <StructuralSection anomalies={compliance.anomalies} />
        <ComplianceCacheLoader
          extraction={extraction}
          productionId={production.id}
          cachedAnalysis={production.qualitativeAnalysis}
        />
      </div>
    </div>
  );
}
