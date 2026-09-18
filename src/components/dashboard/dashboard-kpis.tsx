"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle, TrendingUp, Building2 } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface DashboardKpisProps {
  totalCount: number;
  alertCount: number;
  avgCoutMinute: number;
  producerCount: number;
}

const kpiIcons = { total: FileText, alerts: AlertTriangle, avg: TrendingUp, producers: Building2 } as const;
const kpiKeys = ["total", "alerts", "avg", "producers"] as const;

export function DashboardKpis({ totalCount, alertCount, avgCoutMinute, producerCount }: DashboardKpisProps) {
  const t = useTranslations("dashboard.kpis");
  const values: Record<string, string> = {
    total: String(totalCount),
    alerts: String(alertCount),
    avg: fmt.format(avgCoutMinute) + "/min",
    producers: String(producerCount),
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpiKeys.map((key) => {
        const Icon = kpiIcons[key];
        return (
          <Card key={key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${key === "alerts" ? "bg-red-50 dark:bg-red-950" : "bg-primary/10"}`}>
                <Icon className={`size-5 ${key === "alerts" ? "text-red-600 dark:text-red-400" : "text-primary"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t(`${key}.label`)} <InfoTip>{t(`${key}.tip`)}</InfoTip>
                </p>
                <p className="text-xl font-bold tabular-nums">{values[key]}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
