"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import type { ProducerRoleStats } from "@/lib/db/queries-history";
import type { ComplianceMatrixRow } from "@/lib/analytics/queries-analytics";

interface PersonnelLine {
  poste: string;
  role_key: string;
  tarif_journalier: number;
  nombre_jours: number;
  type_contrat?: string;
}

interface ProducerRate {
  producteur: string;
  avgRate: number;
  occurrences: number;
}

interface RoleComparisonProps {
  currentPostes: PersonnelLine[];
  producerHistory: ProducerRoleStats[];
  producerName: string;
  currentProductionId: number;
  crossProducerRoles?: ComplianceMatrixRow[];
  allProducers?: string[];
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
function fmtDate(s: string) {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? s : dateFmt.format(d);
}

function DeviationBadge({ current, avg }: { current: number; avg: number }) {
  if (avg === 0) return null;
  const pct = Math.round(((current - avg) / avg) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">0%</span>;
  const positive = pct > 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-red-600" : "text-green-600"}`}>
      {positive ? "+" : ""}{pct}%
    </span>
  );
}

function RoleRow({
  poste,
  history,
  currentProductionId,
  producerName,
  otherProducerRates,
}: {
  poste: PersonnelLine;
  history: ProducerRoleStats | undefined;
  currentProductionId: number;
  producerName: string;
  otherProducerRates: ProducerRate[];
}) {
  const t = useTranslations("comparison.roleComparison");
  const [open, setOpen] = useState(false);
  const otherOccurrences = (history?.occurrences.filter((o) => o.productionId !== currentProductionId) ?? [])
    .sort((a, b) => b.tarifJournalier - a.tarifJournalier);
  const hasDetail = otherOccurrences.length > 0 || otherProducerRates.length > 0;

  return (
    <>
      <tr
        className={`border-b last:border-0 ${hasDetail ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => hasDetail && setOpen(!open)}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {hasDetail && (
              <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            )}
            <span className="font-medium">{poste.poste}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right font-mono">{fmt.format(poste.tarif_journalier)} €/j</td>
        <td className="px-4 py-2.5 text-right font-mono">
          {history ? <>{fmt.format(history.avgRate)} €/j</> : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right">
          {history ? <DeviationBadge current={poste.tarif_journalier} avg={history.avgRate} /> : null}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
          {history ? (
            <>{fmt.format(history.minRate)} – {fmt.format(history.maxRate)} €</>
          ) : "—"}
        </td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">
          {otherProducerRates.length > 0 ? t("otherProducerCount", { count: otherProducerRates.length }) : "—"}
        </td>
      </tr>
      {open && hasDetail && (
        <tr>
          <td colSpan={6} className="bg-muted/20 px-4 py-3">
            <div className="ml-6 space-y-3">
              {otherOccurrences.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("historyFor", { producer: producerName })}</p>
                  {otherOccurrences.map((o) => (
                    <div key={`${o.productionId}-${o.tarifJournalier}`} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{fmt.format(o.tarifJournalier)} €/j</span>
                      <span>×{o.nombreJours}j</span>
                      <span>{o.titre}{o.dateDevis ? ` (${fmtDate(o.dateDevis)})` : ""}</span>
                      <span className="ml-auto">
                        <DeviationBadge current={poste.tarif_journalier} avg={o.tarifJournalier} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {otherProducerRates.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("otherProducers")}</p>
                  {otherProducerRates.map((pr) => (
                    <div key={pr.producteur} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{fmt.format(pr.avgRate)} €/j</span>
                      <span>×{t("occurrenceCount", { count: pr.occurrences })}</span>
                      <span>{pr.producteur}</span>
                      <span className="ml-auto">
                        <DeviationBadge current={poste.tarif_journalier} avg={pr.avgRate} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RoleComparison({ currentPostes, producerHistory, producerName, currentProductionId, crossProducerRoles, allProducers }: RoleComparisonProps) {
  const t = useTranslations("comparison.roleComparison");
  const salaries = currentPostes.filter(
    (p) => p.tarif_journalier > 0 && p.type_contrat !== "forfait" && p.type_contrat !== "prestataire" && p.type_contrat !== "etranger",
  );

  if (salaries.length === 0) return null;

  const historyMap = new Map(producerHistory.map((r) => [r.roleKey, r]));

  // Build cross-producer rates map (excluding current producer)
  const crossProducerMap = new Map<string, ProducerRate[]>();
  if (crossProducerRoles) {
    for (const role of crossProducerRoles) {
      const rates = role.producers
        .filter((p) => p.producteur !== producerName && p.statut !== "no_data" && p.occurrences > 0)
        .map((p) => ({ producteur: p.producteur, avgRate: p.avgRate, occurrences: p.occurrences }))
        .sort((a, b) => b.avgRate - a.avgRate);
      if (rates.length > 0) crossProducerMap.set(role.roleKey, rates);
    }
  }

  const deviations = salaries.filter((p) => {
    const h = historyMap.get(p.role_key);
    return h && h.avgRate > 0 && Math.abs((p.tarif_journalier - h.avgRate) / h.avgRate) > 0.1;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-1.5">
          {t("title", { producer: producerName })}
          <InfoTip>{t("infoTip")}</InfoTip>
          {deviations.length > 0 && (
            <Badge variant="outline" className="ml-2 border-0 bg-yellow-100 text-yellow-800">
              {t("deviationBadge", { count: deviations.length })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">{t("columns.poste")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.currentRate")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.producerAverage", { producer: producerName })}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.deviation")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.minMax")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("columns.otherProducers")}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((p, i) => (
                <RoleRow
                  key={`${p.role_key}-${i}`}
                  poste={p}
                  history={historyMap.get(p.role_key)}
                  currentProductionId={currentProductionId}
                  producerName={producerName}
                  otherProducerRates={crossProducerMap.get(p.role_key) ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
