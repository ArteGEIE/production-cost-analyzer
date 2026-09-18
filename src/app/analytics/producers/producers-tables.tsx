"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnalyticsTable, type Column } from "@/components/analytics/analytics-table";
import type { ProducerSummaryRow, ProducerDetailResult } from "@/lib/analytics/queries-analytics";
import { fmt, fmtDate } from "@/lib/analytics/format";

// ---------------------------------------------------------------------------
// Summary columns
// ---------------------------------------------------------------------------

function getSummaryColumns(
  t: ReturnType<typeof useTranslations<"analytics.producers">>,
): Column<ProducerSummaryRow>[] {
  return [
    {
      key: "producteur",
      label: t("producteur"),
      sortable: true,
      render: (row) => <span className="font-medium">{row.producteur}</span>,
      sortValue: (row) => row.producteur,
    },
    {
      key: "productionCount",
      label: t("productions"),
      align: "right",
      sortable: true,
      render: (row) => row.productionCount,
      sortValue: (row) => row.productionCount,
    },
    {
      key: "avgCoutMinute",
      label: t("avgCoutMinuteShort"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.avgCoutMinute)}&nbsp;&euro;/min</>,
      sortValue: (row) => row.avgCoutMinute,
    },
    {
      key: "trend",
      label: t("trend"),
      tooltip: t("trendTip"),
      align: "center",
      sortable: true,
      render: (row) => {
        if (row.trend === "up")
          return <TrendingUp className="mx-auto size-4 text-red-500" />;
        if (row.trend === "down")
          return <TrendingDown className="mx-auto size-4 text-green-500" />;
        return <Minus className="mx-auto size-4 text-muted-foreground" />;
      },
      sortValue: (row) => (row.trend === "up" ? 2 : row.trend === "down" ? 0 : 1),
    },
    {
      key: "ccAlertCount",
      label: t("ccAlerts"),
      tooltip: t("ccAlertsTip"),
      align: "center",
      sortable: true,
      render: (row) =>
        row.ccAlertCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            {row.ccAlertCount}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
      sortValue: (row) => row.ccAlertCount,
    },
  ];
}

// ---------------------------------------------------------------------------
// Detail: productions table columns
// ---------------------------------------------------------------------------

type ProductionRow = ProducerDetailResult["productions"][number];

function getProductionColumns(
  t: ReturnType<typeof useTranslations<"analytics.producers">>,
): Column<ProductionRow>[] {
  return [
    {
      key: "titre",
      label: t("production"),
      sortable: true,
      render: (row) => (
        <Link
          href={`/productions/${row.id}/compliance`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.titre}
        </Link>
      ),
      sortValue: (row) => row.titre,
    },
    {
      key: "totalDevis",
      label: t("totalDevis"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.totalDevis)}&nbsp;&euro;</>,
      sortValue: (row) => row.totalDevis,
    },
    {
      key: "coutMinute",
      label: t("coutMinute"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.coutMinute)}&nbsp;&euro;</>,
      sortValue: (row) => row.coutMinute,
    },
    {
      key: "alertCount",
      label: t("alerts"),
      align: "center",
      sortable: true,
      render: (row) =>
        row.alertCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            {row.alertCount}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
      sortValue: (row) => row.alertCount,
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
// Exported table wrappers
// ---------------------------------------------------------------------------

export function ProducersSummaryTable({ data }: { data: ProducerSummaryRow[] }) {
  const t = useTranslations("analytics.producers");
  return (
    <AnalyticsTable
      columns={getSummaryColumns(t)}
      data={data}
      defaultSortKey="productionCount"
      defaultSortDir="desc"
      rowHref={(row) => `/analytics/producers?name=${encodeURIComponent(row.producteur)}`}
      emptyMessage={t("emptySummary")}
    />
  );
}

export function ProducerProductionsTable({ data }: { data: ProductionRow[] }) {
  const t = useTranslations("analytics.producers");
  return (
    <AnalyticsTable
      columns={getProductionColumns(t)}
      data={data}
      defaultSortKey="date"
      defaultSortDir="desc"
      rowHref={(row) => `/productions/${row.id}/compliance`}
    />
  );
}
