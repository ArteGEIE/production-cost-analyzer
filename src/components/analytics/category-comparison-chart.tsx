"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface CategoryComparisonChartProps {
  producerBreakdown: Array<{ producteur: string; avgAmount: number; count: number }>;
  avgAmount: number;
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function formatK(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return fmt.format(value);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { producteur: string; avgAmount: number; count: number } }>;
}) {
  const t = useTranslations("analytics.services");
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{d.producteur}</p>
      <p className="mt-1">
        {t("avgAmountTooltip")} <span className="font-medium">{fmt.format(d.avgAmount)} &euro;</span>
      </p>
      <p>
        {t("productionsTooltip")} <span className="font-medium">{d.count}</span>
      </p>
    </div>
  );
}

export function CategoryComparisonChart({
  producerBreakdown,
  avgAmount,
}: CategoryComparisonChartProps) {
  const t = useTranslations("analytics.services");

  if (producerBreakdown.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
        {t("noDataChart")}
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        {t("chartTitle")}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={producerBreakdown}
          margin={{ top: 10, right: 20, bottom: 60, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="producteur"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v: number) => `${formatK(v)} \u20ac`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgAmount}
            stroke="#6b7280"
            strokeDasharray="6 3"
            label={{
              value: t("avgReferenceLabel", { value: fmt.format(avgAmount) }),
              position: "right",
              fill: "#6b7280",
              fontSize: 11,
            }}
          />
          <Bar dataKey="avgAmount" fill="#FA4616" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
