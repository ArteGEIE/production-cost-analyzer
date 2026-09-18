import { getProductionById } from "@/lib/db/queries";
import { getThresholdConfig } from "@/lib/db/queries-settings";
import { getCcMinimums } from "@/lib/db/queries-cc";
import { notFound } from "next/navigation";
import { DevisView } from "./devis-view";
import type { DevisExtraction } from "@/lib/schemas/devis";

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

export default async function DevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const production = await getProductionById(Number(id));
  if (!production || !production.meta || !production.grilleCnc) notFound();

  const devisDate = (production.meta as DevisExtraction["meta"])?.date_devis ?? undefined;
  const [extraction, thresholds, ccRates] = await Promise.all([
    Promise.resolve(toDevisExtraction(production)),
    getThresholdConfig(),
    getCcMinimums(devisDate),
  ]);

  return <DevisView extraction={extraction} productionId={production.id} thresholds={thresholds} ccRates={ccRates} />;
}
