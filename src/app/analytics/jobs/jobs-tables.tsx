"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AnalyticsTable, type Column } from "@/components/analytics/analytics-table";
import type { JobSummaryRow, JobDetailResult } from "@/lib/analytics/queries-analytics";
import { fmt, fmtRate, fmtDate } from "@/lib/analytics/format";
import { isNonConforme } from "@/lib/anomalies/anomaly-engine";
import { buildProducerBars } from "@/components/analytics/job-distribution-chart";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ---------------------------------------------------------------------------
// Summary columns
// ---------------------------------------------------------------------------

function getSummaryColumns(
  t: ReturnType<typeof useTranslations<"analytics.jobs">>,
): Column<JobSummaryRow>[] {
  return [
    {
      key: "label",
      label: t("poste"),
      sortable: true,
      render: (row) => <span className="font-medium">{row.label}</span>,
      sortValue: (row) => row.label,
    },
    {
      key: "occurrences",
      label: t("occurrences"),
      tooltip: t("occurrencesTip"),
      align: "right",
      sortable: true,
      render: (row) => row.occurrences,
      sortValue: (row) => row.occurrences,
    },
    {
      key: "avgRate",
      label: t("avgRate"),
      tooltip: t("avgRateTip"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmtRate.format(row.avgRate)} &euro;/j</>,
      sortValue: (row) => row.avgRate,
    },
    {
      key: "minMax",
      label: t("minMax"),
      tooltip: t("minMaxTip"),
      align: "right",
      render: (row) => (
        <>
          {fmtRate.format(row.minRate)} &ndash; {fmtRate.format(row.maxRate)} &euro;
        </>
      ),
    },
    {
      key: "ccMinimum",
      label: t("ccMinimum"),
      tooltip: t("ccMinimumTip"),
      align: "right",
      render: (row) =>
        row.ccMinimum != null ? (
          <>{fmtRate.format(row.ccMinimum)} &euro;/j</>
        ) : (
          <span className="text-xs text-muted-foreground">{t("horsCC")}</span>
        ),
    },
    {
      key: "alert",
      label: t("alert"),
      tooltip: t("alertTip"),
      align: "center",
      sortable: true,
      render: (row) => {
        if (row.ccMinimum == null) return null;
        if (isNonConforme(row.avgRate, row.ccMinimum)) {
          return (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {t("nonConforme")}
            </span>
          );
        }
        return null;
      },
      sortValue: (row) => {
        if (row.ccMinimum == null) return 0;
        if (isNonConforme(row.avgRate, row.ccMinimum)) return 1;
        return 0;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Detail columns (used inside each accordion — no "Producteur" column)
// ---------------------------------------------------------------------------

type OccurrenceRow = JobDetailResult["occurrences"][number];

function getDetailColumns(
  t: ReturnType<typeof useTranslations<"analytics.jobs">>,
  ccMinimum: number | null,
): Column<OccurrenceRow>[] {
  return [
    {
      key: "titre",
      label: t("production"),
      sortable: true,
      render: (row) => (
        <Link
          href={`/productions/${row.productionId}/compliance`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.titre}
        </Link>
      ),
      sortValue: (row) => row.titre,
    },
    {
      key: "tarifJournalier",
      label: t("tarifJour"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmtRate.format(row.tarifJournalier)} &euro;</>,
      sortValue: (row) => row.tarifJournalier,
    },
    {
      key: "ecartCC",
      label: t("ecartCC"),
      tooltip: t("ecartCCTip"),
      align: "right",
      sortable: true,
      render: (row) => {
        if (ccMinimum == null) return <span className="text-xs text-muted-foreground">{t("horsCC")}</span>;
        const ecart = row.tarifJournalier - ccMinimum;
        const sign = ecart >= 0 ? "+" : "";
        const color = isNonConforme(row.tarifJournalier, ccMinimum) ? "text-red-600" : "text-green-600";
        return <span className={color}>{sign}{fmtRate.format(ecart)} &euro;</span>;
      },
      sortValue: (row) => ccMinimum != null ? row.tarifJournalier - ccMinimum : 0,
    },
    {
      key: "nombreJours",
      label: t("jours"),
      align: "right",
      sortable: true,
      render: (row) => row.nombreJours,
      sortValue: (row) => row.nombreJours,
    },
    {
      key: "total",
      label: t("total"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.total)} &euro;</>,
      sortValue: (row) => row.total,
    },
    {
      key: "date",
      label: t("date"),
      align: "right",
      sortable: true,
      render: (row) => fmtDate.format(new Date(row.createdAt)),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Compliance badge (reused in accordion trigger)
// ---------------------------------------------------------------------------

function ComplianceBadge({ medianRate, ccMinimum }: { medianRate: number; ccMinimum: number | null }) {
  const t = useTranslations("analytics.jobs");
  if (ccMinimum == null) return null;
  if (isNonConforme(medianRate, ccMinimum)) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        {t("nonConforme")}
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Exported table wrappers
// ---------------------------------------------------------------------------

export function JobsSummaryTable({ data }: { data: JobSummaryRow[] }) {
  const t = useTranslations("analytics.jobs");
  return (
    <AnalyticsTable
      columns={getSummaryColumns(t)}
      data={data}
      rowHref={(row) => `/analytics/jobs?role=${encodeURIComponent(row.roleKey)}`}
      emptyMessage={t("emptySummary")}
    />
  );
}

export function JobsDetailTable({
  data,
  ccMinimum,
}: {
  data: JobDetailResult["occurrences"];
  ccMinimum: number | null;
}) {
  const t = useTranslations("analytics.jobs");
  const producerBars = buildProducerBars(data);
  const columns = getDetailColumns(t, ccMinimum);

  // Group occurrences by producer for accordion content
  const byProducer = new Map<string, JobDetailResult["occurrences"]>();
  for (const o of data) {
    const list = byProducer.get(o.producteur) ?? [];
    list.push(o);
    byProducer.set(o.producteur, list);
  }

  return (
    <div className="w-full rounded-md border">
      <h3 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
        {t("detailByProducer")}
      </h3>
      <Accordion multiple>
        {producerBars.map((bar) => (
          <AccordionItem key={bar.producteur} value={bar.producteur}>
            <AccordionTrigger className="px-4">
              <div className="flex flex-1 items-center gap-3">
                <span className="font-medium">{bar.producteur}</span>
                <span className="text-xs text-muted-foreground">
                  {t("detailProducerSummary", { count: bar.count, rate: fmtRate.format(bar.medianRate) })}
                </span>
                <ComplianceBadge medianRate={bar.medianRate} ccMinimum={ccMinimum} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <AnalyticsTable
                columns={columns}
                data={byProducer.get(bar.producteur) ?? []}
                defaultSortKey="tarifJournalier"
                defaultSortDir="desc"
                rowHref={(row) => `/productions/${row.productionId}/compliance`}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
