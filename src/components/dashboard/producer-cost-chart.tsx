"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface ProducerCostChartProps {
  data: { name: string; avgCoutMinute: number }[];
  globalAvg: number;
}

export function ProducerCostChart({ data, globalAvg }: ProducerCostChartProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.chart");
  const chartHeight = Math.max(300, data.length * 32);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {t("title")}{" "}
          <InfoTip>
            {t("tooltip")}
          </InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => fmt.format(v)}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === "number" ? fmt.format(value) + "/min" : String(value ?? ""),
                t("tooltipLabel"),
              ]}
              cursor={{ fill: "#f1f5f9", opacity: 0.5 }}
            />
            <ReferenceLine
              x={globalAvg}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: `${t("refLineLabel")} ${fmt.format(globalAvg)}`, position: "top", fontSize: 11 }}
            />
            <Bar
              dataKey="avgCoutMinute"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry) => {
                if (entry?.name) {
                  router.push(`/analytics/producers?name=${encodeURIComponent(entry.name)}`);
                }
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.avgCoutMinute > globalAvg
                    ? "#dc2626"
                    : "#FA4616"
                  }
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 border-t pt-3">
          <Link
            href="/analytics/producers"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
