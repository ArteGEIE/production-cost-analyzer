import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProducerSummary, getProducerDetail } from "@/lib/analytics/queries-analytics";
import { getGlobalStats } from "@/lib/db/queries-history";
import { CostTrend } from "@/components/comparison/cost-trend";
import { CategoryStructure } from "@/components/comparison/category-structure";
import { CcAlertsSummary } from "@/components/analytics/cc-alerts-summary";
import { parsePeriod } from "@/lib/analytics/parse-period";
import { fmt } from "@/lib/analytics/format";
import { ProducersSummaryTable, ProducerProductionsTable } from "./producers-tables";
import { InfoTip } from "@/components/ui/info-tip";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProducersPage({ searchParams }: Props) {
  const t = await getTranslations("analytics.producers");
  const params = await searchParams;
  const period = parsePeriod(params);
  const typeProduction = params.type;
  const name = params.name;

  // ---- Profile view ----
  if (name) {
    const producerName = decodeURIComponent(name);
    const [detail, globalStats] = await Promise.all([
      getProducerDetail(producerName, period, typeProduction),
      getGlobalStats(),
    ]);

    if (!detail) {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <Link
            href="/analytics/producers"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
          <p className="mt-4 text-muted-foreground">{t("noData")}</p>
        </div>
      );
    }

    const totalCcAlerts = detail.ccAlerts.reduce((s, a) => s + a.count, 0);
    const firstYear = new Date(detail.dateRange.first).getFullYear();
    const lastYear = new Date(detail.dateRange.last).getFullYear();
    const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear} – ${lastYear}`;

    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <Link
          href="/analytics/producers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("backToProducers")}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">{detail.producteur}</h1>

        {/* Header cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("productions")}</p>
            <p className="text-2xl font-bold">{detail.productionCount}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("avgCoutMinute")}</p>
            <p className="text-2xl font-bold">{fmt.format(detail.avgCoutMinute)}&nbsp;&euro;</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("period")}</p>
            <p className="text-2xl font-bold">{yearRange}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("ccAlerts")}</p>
            <p className="text-2xl font-bold">
              {totalCcAlerts > 0 ? (
                <span className="text-red-600">{totalCcAlerts}</span>
              ) : (
                "0"
              )}
            </p>
          </div>
        </div>

        {/* Cost trend chart */}
        <CostTrend history={detail.history} globalAvg={globalStats.avgCoutMinute} />

        {/* Category structure chart */}
        <CategoryStructure
          producerAvgStructure={detail.avgStructure}
          globalAvgStructure={detail.globalAvgStructure}
        />

        {/* CC alerts summary */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">{t("ccAlertsSectionTitle")}</h3>
          <CcAlertsSummary alerts={detail.ccAlerts} />
        </div>

        {/* Productions table */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">{t("productions")}</h3>
          <ProducerProductionsTable data={detail.productions} />
        </div>
      </div>
    );
  }

  // ---- Ranking view ----
  const rows = await getProducerSummary(period, typeProduction);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("pageTitle")}{" "}
        <InfoTip>{t("pageInfoTip")}</InfoTip>
      </h1>
      <ProducersSummaryTable data={rows} />
    </div>
  );
}
