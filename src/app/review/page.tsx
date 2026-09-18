import { redirect, notFound } from "next/navigation";

import { getProductionById, hasDraftProductionFile } from "@/lib/db/queries";
import { getCcMinimums } from "@/lib/db/queries-cc";
import { getThresholdConfig } from "@/lib/db/queries-settings";
import type { DevisExtraction } from "@/lib/schemas/devis";
import { ReviewContent } from "./review-content";

function toDevisExtraction(
  row: NonNullable<Awaited<ReturnType<typeof getProductionById>>>,
): DevisExtraction {
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

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const numericId = Number(id);
  if (!id || !Number.isInteger(numericId) || numericId <= 0) redirect("/productions/import");

  const production = await getProductionById(numericId, { includeDrafts: true });
  if (!production || !production.meta || !production.grilleCnc) notFound();

  const extraction = toDevisExtraction(production);
  const [thresholds, ccRates, hasPdf] = await Promise.all([
    getThresholdConfig(),
    getCcMinimums(),
    hasDraftProductionFile(production.id),
  ]);

  return (
    <ReviewContent
      extraction={extraction}
      productionId={production.id}
      hasPdf={hasPdf}
      thresholds={thresholds}
      ccRates={ccRates}
    />
  );
}
