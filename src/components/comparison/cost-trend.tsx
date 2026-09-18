"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Scatter,
  ComposedChart,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CostTrendProps {
  history: Array<{ id: number; titre: string; coutMinute: number; createdAt: string }>;
  currentId?: number;
  globalAvg: number;
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { titre: string; coutMinute: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background p-2 text-sm shadow-sm">
      <p className="font-medium">{d.titre}</p>
      <p className="text-muted-foreground">{fmt.format(d.coutMinute)}&nbsp;&euro;/min</p>
    </div>
  );
}

export function CostTrend({ history, currentId, globalAvg }: CostTrendProps) {
  const t = useTranslations("comparison.costTrend");
  // Sort by createdAt ascending for chronological display
  const chronological = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const data = chronological.map((p, i) => ({
    index: i + 1,
    titre: p.titre,
    coutMinute: p.coutMinute,
    isCurrent: currentId !== undefined && p.id === currentId,
    // For the highlighted dot
    currentDot: currentId !== undefined && p.id === currentId ? p.coutMinute : undefined,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length <= 1 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                label={{ value: t("xAxisLabel"), position: "insideBottom", offset: -5 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v: number) => fmt.format(v)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={globalAvg}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                label={{ value: t("avgReferenceLabel", { value: fmt.format(globalAvg) }), position: "right", fill: "#94a3b8", fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="coutMinute"
                stroke="#FA4616"
                strokeWidth={2}
                dot={(props) => {
                  const { cx = 0, cy = 0, payload: dotPayload } = props as { cx?: number; cy?: number; payload: { isCurrent: boolean } };
                  if (dotPayload.isCurrent) {
                    return (
                      <circle
                        key={`current-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${cx}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="#FA4616"
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
