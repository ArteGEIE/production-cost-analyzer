"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import type { Anomalie } from "@/lib/schemas/devis";

interface SummaryCardProps {
  anomalies: Anomalie[];
}

export function SummaryCard({ anomalies }: SummaryCardProps) {
  const t = useTranslations("compliance.summary");
  const counts = {
    elevee: anomalies.filter((a) => a.severite === "ÉLEVÉE").length,
    attention: anomalies.filter((a) => a.severite === "ATTENTION").length,
    info: anomalies.filter((a) => a.severite === "INFO").length,
  };

  const hasHighSeverity = counts.elevee > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg inline-flex items-center gap-1.5">
          {t("title")}
          <InfoTip>{t("titleTip")}</InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-3">
          {counts.elevee > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium">{t("critical", { count: counts.elevee })}</span>
            </div>
          )}
          {counts.attention > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">{t("attention", { count: counts.attention })}</span>
            </div>
          )}
          {counts.info > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">{t("info", { count: counts.info })}</span>
            </div>
          )}
          {anomalies.length === 0 && (
            <span className="text-sm text-muted-foreground">{t("none")}</span>
          )}
        </div>
        <p className={`text-sm font-medium ${hasHighSeverity ? "text-red-700" : "text-green-700"}`}>
          {hasHighSeverity ? t("detected", { count: counts.elevee }) : t("noneDetected")}
        </p>
      </CardContent>
    </Card>
  );
}
