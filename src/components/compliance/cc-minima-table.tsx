"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { statutConfig } from "@/lib/config/compliance-ui";
import type { VerificationMinima } from "@/lib/schemas/devis";

function formatDateFr(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface CcMinimaTableProps {
  verificationMinima: VerificationMinima[];
  ccEffectiveDate?: string | null;
}

export function CcMinimaTable({ verificationMinima, ccEffectiveDate }: CcMinimaTableProps) {
  const t = useTranslations("compliance.minimaTable");
  const tStatut = useTranslations("config.statut");

  if (verificationMinima.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          {ccEffectiveDate && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("appliedScale", { date: formatDateFr(ccEffectiveDate) })}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">{t("columns.poste")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.tarifJour")}</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    {t("columns.minimumCc")}
                    <InfoTip>{t("minimumCcTooltip")}</InfoTip>
                  </span>
                </th>
                <th className="px-4 py-2.5 text-right font-medium" title={t("ecartTooltip")}>{t("columns.ecart")}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t("columns.statut")}</th>
              </tr>
            </thead>
            <tbody>
              {verificationMinima.map((v, i) => {
                const statut = statutConfig[v.statut] ?? { color: "" };
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">{v.poste}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{v.tarif_journalier} €</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {v.minimum_cc != null ? `${v.minimum_cc} €` : <span className="text-xs font-normal text-muted-foreground">{t("horsCc")}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {v.ecart_pourcent != null
                        ? `${v.ecart_pourcent > 0 ? "+" : ""}${v.ecart_pourcent}%`
                        : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`border-0 ${statut.color}`} title={tStatut(`${v.statut}.tooltip`)}>
                        {tStatut(`${v.statut}.label`)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
