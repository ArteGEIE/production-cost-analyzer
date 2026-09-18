"use client";

import { useTranslations } from "next-intl";
import { isNonConforme } from "@/lib/anomalies/anomaly-engine";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import { fmtRate } from "@/lib/analytics/format";

interface Occurrence {
  productionId: number;
  titre: string;
  producteur: string;
  tarifJournalier: number;
  nombreJours: number;
  total: number;
  createdAt: string;
}

export interface JobDistributionChartProps {
  occurrences: Occurrence[];
  ccMinimum: number | null;
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function barColor(medianRate: number, ccMin: number | null): string {
  if (ccMin == null) return "#3b82f6"; // blue — no CC reference
  if (isNonConforme(medianRate, ccMin)) return "#ef4444"; // red — below minimum
  return "#22c55e"; // green — compliant
}

export interface ProducerBar {
  producteur: string;
  medianRate: number;
  count: number;
}

export function buildProducerBars(occurrences: Occurrence[]): ProducerBar[] {
  const grouped = new Map<string, number[]>();
  for (const o of occurrences) {
    const rates = grouped.get(o.producteur) ?? [];
    rates.push(o.tarifJournalier);
    grouped.set(o.producteur, rates);
  }

  const bars: ProducerBar[] = [];
  for (const [producteur, rates] of grouped) {
    bars.push({ producteur, medianRate: median(rates), count: rates.length });
  }
  bars.sort((a, b) => b.medianRate - a.medianRate);
  return bars;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProducerBar }>;
}) {
  const t = useTranslations("analytics.jobs");
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{d.producteur}</p>
      <p className="mt-1">
        {t("medianRateTooltip")} <span className="font-medium">{fmtRate.format(d.medianRate)} &euro;/jour</span>
      </p>
      <p>
        {t("productionsTooltip")} <span className="font-medium">{d.count}</span>
      </p>
    </div>
  );
}

export function JobDistributionChart({ occurrences, ccMinimum }: JobDistributionChartProps) {
  const t = useTranslations("analytics.jobs");
  const bars = buildProducerBars(occurrences);
  const chartHeight = Math.max(200, bars.length * 36 + 60);

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        {t("medianRateChartTitle")}
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart layout="vertical" data={bars} margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${fmt.format(v)} \u20ac`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="producteur"
            width={140}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }} />
          {ccMinimum != null && (
            <ReferenceLine
              x={ccMinimum}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{
                value: t("ccMinReferenceLabel", { value: fmt.format(ccMinimum) }),
                position: "top",
                fill: "#ef4444",
                fontSize: 11,
              }}
            />
          )}
          <Bar dataKey="medianRate" radius={[0, 4, 4, 0]}>
            {bars.map((bar) => (
              <Cell key={bar.producteur} fill={barColor(bar.medianRate, ccMinimum)} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v) => t("productionsSuffix", { count: Number(v) })}
              style={{ fontSize: 11, fill: "#6b7280" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
