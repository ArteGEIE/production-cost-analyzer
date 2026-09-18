"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import {
  ACCORD_TRANSPARENCE,
  DEFAULT_ACCORD_TYPE,
} from "@/lib/config/accord-transparence";

interface SubCatBreakdown {
  fraisGeneraux: number;
  fraisFinanciers: number;
  imprevus: number;
  productionDeleguee: number;
}

interface Props {
  actualBreakdown: SubCatBreakdown;
  totalDevisAvg: number;
}

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function Row({
  label,
  actual,
  reference,
  isAmount,
}: {
  label: string;
  actual: number;
  reference: number;
  isAmount?: boolean;
}) {
  const deviation = reference > 0 ? (actual - reference) / reference : 0;
  const deviationPct = Math.round(deviation * 100);
  const overBudget = actual > reference && Math.abs(deviationPct) > 5;

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 font-medium">{label}</td>
      <td className="px-4 py-2.5 text-right font-mono">
        {isAmount ? `${fmt.format(actual)} €` : fmtPct(actual)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
        {isAmount ? `${fmt.format(reference)} €` : fmtPct(reference)}
      </td>
      <td className="px-4 py-2.5 text-right">
        {reference > 0 ? (
          <span className={`text-xs font-medium ${overBudget ? "text-red-600" : "text-green-600"}`}>
            {deviationPct > 0 ? "+" : ""}{deviationPct}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function AccordTransparenceCard({ actualBreakdown, totalDevisAvg }: Props) {
  const t = useTranslations("analytics.accordTransparence");
  const tAccordType = useTranslations("config.accordTransparence");
  const ref = ACCORD_TRANSPARENCE[DEFAULT_ACCORD_TYPE];
  const label = tAccordType(DEFAULT_ACCORD_TYPE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-1.5">
          {t("cardTitle", { label })}
          <InfoTip>{t("infoTip", { label })}</InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">{t("poste")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("moyObservee")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("accord")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("ecart")}</th>
              </tr>
            </thead>
            <tbody>
              <Row label={t("fraisGeneraux")} actual={actualBreakdown.fraisGeneraux} reference={ref.fraisGeneraux} />
              <Row label={t("fraisFinanciers")} actual={actualBreakdown.fraisFinanciers} reference={ref.fraisFinanciers} />
              <Row label={t("imprevus")} actual={actualBreakdown.imprevus} reference={ref.imprevus} />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <strong>{t("productionDeleguee")}</strong> {ref.productionDeleguee}
        </p>
      </CardContent>
    </Card>
  );
}
