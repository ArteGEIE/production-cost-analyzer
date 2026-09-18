import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getJobSummary, getJobDetail } from "@/lib/analytics/queries-analytics";
import { JobDistributionChart } from "@/components/analytics/job-distribution-chart";
import { parsePeriod } from "@/lib/analytics/parse-period";
import { fmtRate } from "@/lib/analytics/format";
import { JobsSummaryTable, JobsDetailTable } from "./jobs-tables";
import { InfoTip } from "@/components/ui/info-tip";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function JobsPage({ searchParams }: Props) {
  const t = await getTranslations("analytics.jobs");
  const params = await searchParams;
  const period = parsePeriod(params);
  const typeProduction = params.type;
  const roleKey = params.role;

  // ---- Detail view ----
  if (roleKey) {
    const detail = await getJobDetail(roleKey, period, typeProduction);

    if (!detail) {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <Link
            href="/analytics/jobs"
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
          href="/analytics/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("backToJobs")}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">{detail.label}</h1>

        {/* Header cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("avgRate")}</p>
            <p className="text-2xl font-bold">{fmtRate.format(detail.globalAvgRate)} &euro;/j</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("ccMinimum")}</p>
            <p className="text-2xl font-bold">
              {detail.ccMinimum != null ? (
                <>{fmtRate.format(detail.ccMinimum)} &euro;/j</>
              ) : (
                <span className="text-base font-normal text-muted-foreground">{t("horsCC")}</span>
              )}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("occurrences")}</p>
            <p className="text-2xl font-bold">{detail.occurrences.length}</p>
          </div>
        </div>

        {/* Scatter chart */}
        <JobDistributionChart occurrences={detail.occurrences} ccMinimum={detail.ccMinimum} />

        {/* Detail table grouped by producer */}
        <JobsDetailTable data={detail.occurrences} ccMinimum={detail.ccMinimum} />
      </div>
    );
  }

  // ---- Summary view ----
  const rows = await getJobSummary(period, typeProduction);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("pageTitle")}{" "}
        <InfoTip>{t("pageInfoTip")}</InfoTip>
      </h1>
      <JobsSummaryTable data={rows} />
    </div>
  );
}
