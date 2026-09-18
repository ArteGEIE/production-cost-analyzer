"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { CncGridTable } from "@/components/cnc-grid-table";
import { cn } from "@/lib/utils";
import type { DevisExtraction } from "@/lib/schemas/devis";

/** Recursive partial — every nested property is optional during streaming. */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

interface ExtractionResultsProps {
  data: DeepPartial<DevisExtraction>;
  isStreaming?: boolean;
}

function formatEuroBig(amount: number | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  });
}

function MetadataField({ label, value }: { label: string; value?: string | number }) {
  if (value == null) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

export function ExtractionResults({ data, isStreaming }: ExtractionResultsProps) {
  const t = useTranslations("upload.results");
  const meta = data.meta;

  // A card is "complete" when its key terminal field has arrived
  const metaComplete = !isStreaming || data.confiance != null;
  const gridComplete = !isStreaming || data.total_devis != null;
  const totalsComplete = !isStreaming || (data.total_devis != null && data.cout_minute != null);

  return (
    <div className="flex flex-col gap-6">
      {/* Metadata */}
      <Card className={cn(!metaComplete && "streaming-shimmer")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{meta?.titre ?? t("extracting")}</span>
            <ConfidenceBadge confiance={data.confiance as "haute" | "moyenne" | "basse" | undefined} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
            <MetadataField label={t("producteur")} value={meta?.producteur} />
            <MetadataField label={t("duree")} value={meta?.duree_minutes ? `${meta.duree_minutes} min` : undefined} />
            <MetadataField label={t("type")} value={meta?.type_production} />
            <MetadataField label={t("diffuseur")} value={meta?.diffuseur ?? undefined} />
            <MetadataField label={t("lieuTournage")} value={meta?.lieu_tournage ?? undefined} />
          </dl>
        </CardContent>
      </Card>

      {/* CNC Grid */}
      <Card className={cn(!gridComplete && "streaming-shimmer")}>
        <CardHeader>
          <CardTitle>{t("grilleCnc")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CncGridTable
            grilleCnc={data.grille_cnc}
            totalDevis={data.total_devis}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={cn(!totalsComplete && "streaming-shimmer")}>
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("totalDevis")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
              {formatEuroBig(data.total_devis)}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(!totalsComplete && "streaming-shimmer")}>
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("coutMinute")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
              {formatEuroBig(data.cout_minute)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unclassified items */}
      {data.postes_non_classes && data.postes_non_classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("postesNonClasses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {data.postes_non_classes.map((poste, i) => (
                <li key={i}>
                  {typeof poste === "string"
                    ? poste
                    : `${poste.poste} — ${poste.montant?.toLocaleString("fr-FR")} €${poste.categorie_suggeree ? ` (${t("suggestion", { category: poste.categorie_suggeree })})` : ""}`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
