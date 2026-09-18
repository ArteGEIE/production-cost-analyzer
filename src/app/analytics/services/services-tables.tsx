"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AnalyticsTable, type Column } from "@/components/analytics/analytics-table";
import type { CategorySummaryRow, CategoryDetailResult } from "@/lib/analytics/queries-analytics";
import { fmt, fmtPct, fmtDate } from "@/lib/analytics/format";
import { SubcategoryBars } from "@/components/analytics/subcategory-bars";
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
  t: ReturnType<typeof useTranslations<"analytics.services">>,
  tCncGrid: ReturnType<typeof useTranslations<"config.cncGrid">>,
): Column<CategorySummaryRow>[] {
  return [
    {
      key: "label",
      label: t("category"),
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium">{tCncGrid(row.categoryKey)}</span>
          <SubcategoryBars items={row.topSubCategories} />
        </div>
      ),
      sortValue: (row) => tCncGrid(row.categoryKey),
    },
    {
      key: "avgAmount",
      label: t("avgAmount"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.avgAmount)} &euro;</>,
      sortValue: (row) => row.avgAmount,
    },
    {
      key: "avgPct",
      label: t("avgPct"),
      tooltip: t("avgPctTip"),
      align: "right",
      sortable: true,
      render: (row) => fmtPct(row.avgPct),
      sortValue: (row) => row.avgPct,
    },
    {
      key: "minMax",
      label: t("minMax"),
      tooltip: t("minMaxTip"),
      align: "right",
      render: (row) => (
        <>
          {fmt.format(row.minAmount)} &ndash; {fmt.format(row.maxAmount)} &euro;
        </>
      ),
    },
    {
      key: "threshold",
      label: t("threshold"),
      tooltip: t("thresholdTip"),
      align: "center",
      render: (row) =>
        row.thresholdLow != null && row.thresholdHigh != null ? (
          <span className="text-muted-foreground">
            {fmtPct(row.thresholdLow)} &ndash; {fmtPct(row.thresholdHigh)}
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "alert",
      label: t("alert"),
      tooltip: t("alertTip"),
      align: "center",
      sortable: true,
      render: (row) => {
        if (row.thresholdLow != null && row.avgPct < row.thresholdLow) {
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {t("belowThreshold")}
            </span>
          );
        }
        if (row.thresholdHigh != null && row.avgPct > row.thresholdHigh) {
          return (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {t("aboveThreshold")}
            </span>
          );
        }
        return null;
      },
      sortValue: (row) => {
        if (row.thresholdLow != null && row.avgPct < row.thresholdLow) return 2;
        if (row.thresholdHigh != null && row.avgPct > row.thresholdHigh) return 1;
        return 0;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Line items columns (individual postes, not grouped)
// ---------------------------------------------------------------------------

type LineItemRow = CategoryDetailResult["lineItems"][number];

function getLineItemColumns(
  t: ReturnType<typeof useTranslations<"analytics.services">>,
): Column<LineItemRow>[] {
  return [
    {
      key: "poste",
      label: t("poste"),
      sortable: true,
      render: (row) => <span className="font-medium">{row.poste}</span>,
      sortValue: (row) => row.poste,
    },
    {
      key: "montant",
      label: t("montant"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.montant)} &euro;</>,
      sortValue: (row) => row.montant,
    },
    {
      key: "producteur",
      label: t("producteur"),
      sortable: true,
      render: (row) => row.producteur,
      sortValue: (row) => row.producteur,
    },
    {
      key: "titre",
      label: t("production"),
      sortable: true,
      render: (row) => (
        <Link
          href={`/productions/${row.productionId}/devis`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.titre}
        </Link>
      ),
      sortValue: (row) => row.titre,
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
// Productions columns
// ---------------------------------------------------------------------------

type ProductionRow = CategoryDetailResult["productions"][number];

function getProductionColumns(
  t: ReturnType<typeof useTranslations<"analytics.services">>,
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
      key: "amount",
      label: t("montant"),
      align: "right",
      sortable: true,
      render: (row) => <>{fmt.format(row.amount)} &euro;</>,
      sortValue: (row) => row.amount,
    },
    {
      key: "pct",
      label: t("pctDevis"),
      align: "right",
      sortable: true,
      render: (row) => fmtPct(row.pct),
      sortValue: (row) => row.pct,
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

interface ProducerGroup {
  producteur: string;
  count: number;
  avgAmount: number;
  productions: ProductionRow[];
}

function groupByProducer(productions: ProductionRow[]): ProducerGroup[] {
  const grouped = new Map<string, ProductionRow[]>();
  for (const p of productions) {
    const list = grouped.get(p.producteur) ?? [];
    list.push(p);
    grouped.set(p.producteur, list);
  }

  const groups: ProducerGroup[] = [];
  for (const [producteur, prods] of grouped) {
    const avg = prods.reduce((sum, p) => sum + p.amount, 0) / prods.length;
    groups.push({ producteur, count: prods.length, avgAmount: Math.round(avg), productions: prods });
  }
  groups.sort((a, b) => b.avgAmount - a.avgAmount);
  return groups;
}

// ---------------------------------------------------------------------------
// Exported table wrappers
// ---------------------------------------------------------------------------

export function ServicesSummaryTable({ data }: { data: CategorySummaryRow[] }) {
  const t = useTranslations("analytics.services");
  const tCncGrid = useTranslations("config.cncGrid");
  return (
    <AnalyticsTable
      columns={getSummaryColumns(t, tCncGrid)}
      data={data}
      rowHref={(row) => `/analytics/services?category=${encodeURIComponent(row.categoryKey)}`}
      emptyMessage={t("emptySummary")}
    />
  );
}

export function LineItemsTable({ data }: { data: LineItemRow[] }) {
  const t = useTranslations("analytics.services");
  return (
    <AnalyticsTable
      columns={getLineItemColumns(t)}
      data={data}
      defaultSortKey="montant"
      defaultSortDir="desc"
    />
  );
}

export function ServicesProductionsTable({ data }: { data: ProductionRow[] }) {
  const t = useTranslations("analytics.services");
  const groups = groupByProducer(data);
  const columns = getProductionColumns(t);

  return (
    <div className="w-full rounded-md border">
      <h3 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
        {t("detailByProducer")}
      </h3>
      <Accordion multiple>
        {groups.map((group) => (
          <AccordionItem key={group.producteur} value={group.producteur}>
            <AccordionTrigger className="px-4">
              <div className="flex flex-1 items-center gap-3">
                <span className="font-medium">{group.producteur}</span>
                <span className="text-xs text-muted-foreground">
                  {t("detailProducerSummary", { count: group.count, amount: fmt.format(group.avgAmount) })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <AnalyticsTable
                columns={columns}
                data={group.productions}
                defaultSortKey="amount"
                defaultSortDir="desc"
                rowHref={(row) => `/productions/${row.id}/compliance`}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
