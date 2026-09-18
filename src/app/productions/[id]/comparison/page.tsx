import { getTranslations } from "next-intl/server";
import { getProductionById } from "@/lib/db/queries";
import {
  getProductionStats,
  getGlobalStats,
  getProducerRanking,
  getProductionsByProducteur,
  getProducerRoleHistory,
  getComparisonFilterOptions,
  type ComparisonFilters as ComparisonFilterValues,
} from "@/lib/db/queries-history";
import { getComplianceMatrix } from "@/lib/analytics/queries-analytics";
import {
  grilleToPctStructure,
  computeCategoryDeviations,
} from "@/lib/comparison/compute-stats";
import { CostPositioning } from "@/components/comparison/cost-positioning";
import { CategoryStructure } from "@/components/comparison/category-structure";
import { CostTrend } from "@/components/comparison/cost-trend";
import { ProducerRanking } from "@/components/comparison/producer-ranking";
import { RoleComparison } from "@/components/comparison/role-comparison";
import { ComparisonFilters } from "@/components/comparison/comparison-filters";
import { notFound } from "next/navigation";

function parseProducteursParam(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDureeParam(raw?: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function ComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tPeer = await getTranslations("comparison.peerLabels");
  const production = await getProductionById(Number(id));
  if (!production) notFound();

  const typeFilter = production.typeProduction ?? undefined;

  // Parse URL-driven filters
  const peerProducteurs = parseProducteursParam(sp.producteurs);
  const dureeMinutes = parseDureeParam(sp.duree);

  // Producer-history queries: scope by duration only (producer is fixed = current).
  const producerFilters: ComparisonFilterValues = { dureeMinutes: dureeMinutes ?? undefined };

  // Peer-set queries: when the user picked specific producers, build the peer set as
  // {current producer} ∪ {selected peers}. Otherwise leave empty (= "tous les producteurs").
  const peerSet =
    peerProducteurs.length > 0
      ? Array.from(new Set([production.producteur, ...peerProducteurs]))
      : [];
  const peerFilters: ComparisonFilterValues = {
    dureeMinutes: dureeMinutes ?? undefined,
    producteurs: peerSet.length > 0 ? peerSet : undefined,
  };

  // Fetch all data in parallel
  const [
    producerStats,
    globalStats,
    ranking,
    producerHistory,
    roleHistory,
    complianceMatrix,
    filterOptions,
  ] = await Promise.all([
    getProductionStats(production.producteur, typeFilter, producerFilters),
    getGlobalStats(typeFilter, peerFilters),
    getProducerRanking(typeFilter, peerFilters),
    getProductionsByProducteur(production.producteur),
    getProducerRoleHistory(production.producteur, typeFilter, producerFilters),
    getComplianceMatrix(undefined, typeFilter),
    getComparisonFilterOptions(typeFilter),
  ]);

  // Compute current production's CNC structure as percentages
  const grilleCnc = (production.grilleCnc ?? {}) as Record<string, { total: number }>;
  const totalDevis = production.totalDevis ?? 0;
  const currentStructure = grilleToPctStructure(grilleCnc, totalDevis);

  // Extract current personnel lines for role comparison
  const personnel = grilleCnc["2_personnel"] as { postes?: { poste: string; role_key: string; tarif_journalier: number; nombre_jours: number; type_contrat?: string }[] } | undefined;
  const currentPostes = personnel?.postes ?? [];

  // Compute category deviations vs producer historical average structure
  const categoryDeviations = computeCategoryDeviations(
    currentStructure,
    producerStats.avgStructure,
  );

  // Build history array for trend chart (filtered by type for consistency, and by
  // the duration filter so the trend only includes comparable formats)
  const history = producerHistory
    .filter(
      (p) =>
        p.coutMinute != null &&
        (!typeFilter || p.typeProduction === typeFilter) &&
        (dureeMinutes == null || p.dureeMinutes === dureeMinutes),
    )
    .map((p) => ({
      id: p.id,
      titre: p.titre,
      coutMinute: p.coutMinute!,
      createdAt: p.createdAt,
    }));

  const isPeerSet = peerProducteurs.length > 0;
  const peerLabel = isPeerSet ? tPeer("peerSet") : tPeer("global");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-6">
        <ComparisonFilters
          producteurs={filterOptions.producteurs}
          durees={filterOptions.durees}
          currentProducteur={production.producteur}
          selectedProducteurs={peerProducteurs}
          selectedDuree={dureeMinutes}
        />

        <CostPositioning
          currentCoutMinute={production.coutMinute ?? 0}
          producerAvg={producerStats.avgCoutMinute}
          globalAvg={globalStats.avgCoutMinute}
          producerName={production.producteur}
          producerCount={producerStats.count}
          globalLabel={peerLabel}
          globalCount={globalStats.count}
          isPeerSet={isPeerSet}
        />

        <CategoryStructure
          currentStructure={currentStructure}
          producerAvgStructure={producerStats.avgStructure}
          globalAvgStructure={globalStats.avgStructure}
          categoryDeviations={categoryDeviations}
          globalLabel={peerLabel}
        />

        <RoleComparison
          currentPostes={currentPostes}
          producerHistory={roleHistory}
          producerName={production.producteur}
          currentProductionId={production.id}
          crossProducerRoles={complianceMatrix.roles}
          allProducers={complianceMatrix.producers}
        />

        <CostTrend
          history={history}
          currentId={production.id}
          globalAvg={globalStats.avgCoutMinute}
        />

        <ProducerRanking
          ranking={ranking}
          currentProducteur={production.producteur}
        />
      </div>
    </div>
  );
}
