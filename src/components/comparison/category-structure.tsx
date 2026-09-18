"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import type { CategoryDeviation } from "@/lib/comparison/compute-stats";

interface CategoryStructureProps {
  currentStructure?: Record<string, number>;
  producerAvgStructure: Record<string, number>;
  globalAvgStructure: Record<string, number>;
  categoryDeviations?: Record<string, CategoryDeviation>;
  /** Legend label for the peer/global bar. Defaults to the "global" peer label. */
  globalLabel?: string;
}

const CNC_KEYS = [
  "1_droits_artistiques",
  "2_personnel",
  "3_interpretation",
  "4_charges_sociales",
  "5_decors_costumes",
  "6_transport",
  "7_tournage",
  "8_post_production",
  "9_assurance",
  "10_imprevus_fg_pd",
];

const fmtPct = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function CategoryStructure({
  currentStructure,
  producerAvgStructure,
  globalAvgStructure,
  categoryDeviations,
  globalLabel,
}: CategoryStructureProps) {
  const t = useTranslations("comparison.categoryStructure");
  const tPeer = useTranslations("comparison.peerLabels");
  const resolvedGlobalLabel = globalLabel ?? tPeer("global");

  const data = CNC_KEYS.map((key) => ({
    name: t(`shortLabels.${key}`),
    key,
    ...(currentStructure !== undefined ? { current: (currentStructure[key] ?? 0) * 100 } : {}),
    producer: (producerAvgStructure[key] ?? 0) * 100,
    global: (globalAvgStructure[key] ?? 0) * 100,
    isOutlier: categoryDeviations?.[key]?.isOutlier ?? false,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
            {t("title")}{" "}
            <InfoTip>{t("infoTip")}</InfoTip>
          </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis
              domain={[0, 60]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [fmtPct.format(Number(value) / 100), ""]}
            />
            <Legend verticalAlign="top" height={30} />
            {currentStructure !== undefined && (
              <Bar dataKey="current" name={t("currentQuote")} fill="#FA4616" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill="#FA4616"
                    stroke={entry.isOutlier ? "#dc2626" : undefined}
                    strokeWidth={entry.isOutlier ? 2 : 0}
                  />
                ))}
              </Bar>
            )}
            <Bar dataKey="producer" name={t("producerAverage")} fill="#FB923C" radius={[2, 2, 0, 0]} />
            <Bar dataKey="global" name={resolvedGlobalLabel} fill="#94a3b8" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
