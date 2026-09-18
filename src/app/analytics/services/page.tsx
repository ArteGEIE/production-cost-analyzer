import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategorySummary, getCategoryDetail } from "@/lib/analytics/queries-analytics";
import { CategoryComparisonChart } from "@/components/analytics/category-comparison-chart";
import { parsePeriod } from "@/lib/analytics/parse-period";
import { fmt, fmtPct } from "@/lib/analytics/format";
import { ServicesSummaryTable, LineItemsTable, ServicesProductionsTable } from "./services-tables";
import { InfoTip } from "@/components/ui/info-tip";
import { AccordTransparenceCard } from "@/components/analytics/accord-transparence-card";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ServicesPage({ searchParams }: Props) {
  const t = await getTranslations("analytics.services");
  const tCncGrid = await getTranslations("config.cncGrid");
  const params = await searchParams;
  const period = parsePeriod(params);
  const typeProduction = params.type;
  const categoryKey = params.category;

  // ---- Detail view ----
  if (categoryKey) {
    const detail = await getCategoryDetail(categoryKey, period, typeProduction);

    if (!detail) {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <Link
            href="/analytics/services"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
          <p className="mt-4 text-muted-foreground">{t("noData")}</p>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <Link
          href="/analytics/services"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("backToServices")}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">{tCncGrid(detail.categoryKey)}</h1>

        {/* Header cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("avgAmount")}</p>
            <p className="text-2xl font-bold">{fmt.format(detail.avgAmount)} &euro;</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("avgPct")}</p>
            <p className="text-2xl font-bold">{fmtPct(detail.avgPct)}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("threshold")}</p>
            <p className="text-2xl font-bold">
              {detail.thresholdLow != null && detail.thresholdHigh != null ? (
                <>
                  {fmtPct(detail.thresholdLow)} &ndash; {fmtPct(detail.thresholdHigh)}
                </>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("productionsCard")}</p>
            <p className="text-2xl font-bold">{detail.productionCount}</p>
          </div>
        </div>

        {/* Producer comparison chart */}
        <CategoryComparisonChart
          producerBreakdown={detail.producerBreakdown}
          avgAmount={detail.avgAmount}
        />

        {/* Accord de transparence reference (category 10 only) */}
        {categoryKey === "10_imprevus_fg_pd" && detail.productionCount > 0 && (() => {
          const subCatTotals = new Map<string, number[]>();
          for (const item of detail.lineItems) {
            const key = (item.sousCategorie ?? item.poste).toLowerCase().replace(/[^a-z_]/g, "_");
            const list = subCatTotals.get(key) ?? [];
            list.push(item.montant);
            subCatTotals.set(key, list);
          }
          const avgRatio = (keys: string[]) => {
            for (const k of keys) {
              const vals = subCatTotals.get(k);
              if (vals && vals.length > 0) {
                const avgAmount = vals.reduce((a, b) => a + b, 0) / detail.productionCount;
                return detail.avgAmount > 0 ? avgAmount / (detail.avgAmount / detail.avgPct) : 0;
              }
            }
            return 0;
          };
          const breakdown = {
            fraisGeneraux: avgRatio(["frais_generaux", "frais_g_n_raux"]),
            fraisFinanciers: avgRatio(["frais_financiers"]),
            imprevus: avgRatio(["imprevus", "impr_vus"]),
            productionDeleguee: avgRatio(["prod_deleguee", "production_deleguee"]),
          };
          return <AccordTransparenceCard actualBreakdown={breakdown} totalDevisAvg={detail.avgAmount / detail.avgPct} />;
        })()}

        {/* Individual line items */}
        {detail.lineItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-medium">{t("detailByPoste")}</h3>
            <LineItemsTable data={detail.lineItems} />
          </div>
        )}

        {/* Productions grouped by producer */}
        <ServicesProductionsTable data={detail.productions} />
      </div>
    );
  }

  // ---- Summary view ----
  const rows = await getCategorySummary(period, typeProduction);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("pageTitle")}{" "}
        <InfoTip>{t("pageInfoTip")}</InfoTip>
      </h1>
      <ServicesSummaryTable data={rows} />
    </div>
  );
}
