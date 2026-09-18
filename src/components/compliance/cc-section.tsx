"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { severityConfig } from "@/lib/config/compliance-ui";
import type { Anomalie } from "@/lib/schemas/devis";

interface CcSectionProps {
  anomalies: Anomalie[];
}

export function CcSection({ anomalies }: CcSectionProps) {
  const t = useTranslations("compliance.ccSection");
  const tAnomalies = useTranslations("config.anomalies");
  const ccAnomalies = anomalies.filter((a) => a.code === "R1");

  if (ccAnomalies.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg inline-flex items-center gap-1.5">
          {t("title", { count: ccAnomalies.length })}
          <InfoTip>{t("tooltip")}</InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ccAnomalies.map((anomalie, i) => {
          const config = severityConfig[anomalie.severite];
          const Icon = config.icon;
          return (
            <Alert key={`${anomalie.code}-${i}`} variant={config.variant}>
              <Icon className="size-4" />
              <AlertTitle className="flex items-center gap-2">
                <Badge variant="outline" className={`border-0 ${config.color}`}>
                  {anomalie.code}
                </Badge>
                <Badge variant="outline" className={`border-0 ${config.color}`}>
                  {anomalie.severite}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                {tAnomalies(anomalie.code, anomalie.params)}
                {anomalie.detailsParams && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    {tAnomalies(`${anomalie.code}Details`, anomalie.detailsParams)}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
