"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";

interface CostPositioningProps {
  currentCoutMinute: number;
  producerAvg: number;
  globalAvg: number;
  producerName: string;
  producerCount: number;
  /** Label for the peer/global average bar. Defaults to the "global" peer label when no peer set is selected. */
  globalLabel?: string;
  /** Number of productions backing the peer/global average. */
  globalCount?: number;
  /** Whether globalLabel represents a selected peer set rather than the global average. */
  isPeerSet?: boolean;
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

function DeviationBadge({ current, avg }: { current: number; avg: number }) {
  if (avg === 0) return null;
  const deviation = (current - avg) / avg;
  const isOutlier = Math.abs(deviation) > 0.3;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isOutlier
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800"
      }`}
    >
      {fmtPct.format(deviation)}
    </span>
  );
}

export function CostPositioning({
  currentCoutMinute,
  producerAvg,
  globalAvg,
  producerName,
  producerCount,
  globalLabel,
  globalCount,
  isPeerSet = false,
}: CostPositioningProps) {
  const t = useTranslations("comparison.costPositioning");
  const tPeer = useTranslations("comparison.peerLabels");
  const resolvedGlobalLabel = globalLabel ?? tPeer("global");
  const data = [
    { name: t("currentQuote"), value: currentCoutMinute, fill: "#FA4616" },
    { name: t("producerAverageChartLabel", { producer: producerName }), value: producerAvg, fill: "#FB923C" },
    { name: resolvedGlobalLabel, value: globalAvg, fill: "#94a3b8" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
            {t("title")}{" "}
            <InfoTip>{t("infoTip")}</InfoTip>
          </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-3xl font-bold">{fmt.format(currentCoutMinute)}&nbsp;&euro;/min</p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              {t("producerAverage", { producer: producerName, count: producerCount })} {fmt.format(producerAvg)}&nbsp;&euro;/min
              <DeviationBadge current={currentCoutMinute} avg={producerAvg} />
            </p>
            <p>
              {isPeerSet ? t("globalAveragePeer") : t("globalAverageDefault")}
              {globalCount != null && t("globalCountSuffix", { count: globalCount })} : {fmt.format(globalAvg)}&nbsp;&euro;/min
              <DeviationBadge current={currentCoutMinute} avg={globalAvg} />
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => fmt.format(v)}
            />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${fmt.format(Number(value))} \u20ac/min`, ""]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
