"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { AppShell } from "@/components/app-shell";
import { PdfViewerPanel } from "@/components/pdf-viewer-panel";
import { useReviewForm } from "@/hooks/use-review-form";
import type { CcRates } from "@/lib/config/cc-minimums";
import { InfoTip } from "@/components/ui/info-tip";
import { MetadataForm } from "@/components/review/metadata-form";
import { CncGridEditor } from "@/components/review/cnc-grid-editor";
import { UnclassifiedSection } from "@/components/review/unclassified-section";
import { publishProductionAction } from "./actions";
import type { DevisExtraction } from "@/lib/schemas/devis";
import type { ThresholdConfig } from "@/lib/db/queries-settings";

interface ReviewContentProps {
  extraction: DevisExtraction;
  productionId: number;
  hasPdf: boolean;
  thresholds: ThresholdConfig;
  ccRates: CcRates;
}

export function ReviewContent({ extraction, productionId, hasPdf, thresholds, ccRates }: ReviewContentProps) {
  const t = useTranslations("review");
  const tErrors = useTranslations("review.errors");
  const form = useReviewForm(extraction, ccRates, thresholds);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  function handleValidate() {
    setError(null);
    startTransition(async () => {
      try {
        const data = form.toDevisExtraction();
        const result = await publishProductionAction(productionId, data);
        if ("error" in result) {
          setError(tErrors(result.error));
        } else {
          router.push(`/productions/${result.id}/compliance`);
        }
      } catch (err) {
        console.error("Save failed:", err);
        setError(tErrors("clientSaveFailed"));
      }
    });
  }

  const footerActions = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/productions/import")}>
          <ArrowLeft className="size-4" />
          {t("back")}
        </Button>
        <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums font-medium text-foreground">
            {form.totalDevis.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span className="font-mono tabular-nums">
            {form.coutMinute.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}/min
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <span className="text-sm text-destructive max-w-[300px] truncate" title={error}>
            {error}
          </span>
        )}
        {hasPdf && (
          <Button variant="outline" size="sm" onClick={() => setShowPdf(!showPdf)}>
            <FileText className="size-4" />
            {showPdf ? t("hidePdf") : t("showPdf")}
          </Button>
        )}
        <Button onClick={handleValidate} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <CheckCircle className="size-4" />
              {t("validate")}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const delta = form.totalDevis - extraction.total_devis;
  const hasDelta = extraction.total_devis > 0 && Math.abs(delta) > 1;
  const deltaPct = hasDelta ? (delta / extraction.total_devis) * 100 : 0;
  const fmtEuro = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const editorContent = (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("title")}{" "}
          <InfoTip>
            {t("titleTip")}
          </InfoTip>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </header>

      {hasDelta && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>{t("deltaAlert.title")}</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200/90">
            {t.rich("deltaAlert.body", {
              calculated: () => (
                <span className="font-mono tabular-nums font-medium">{fmtEuro(form.totalDevis)}</span>
              ),
              delta: () => (
                <span className="font-mono tabular-nums font-medium">
                  {delta > 0 ? "+" : ""}{fmtEuro(delta)} ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)} %)
                </span>
              ),
              extracted: () => (
                <span className="font-mono tabular-nums font-medium">{fmtEuro(extraction.total_devis)}</span>
              ),
            })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("metadata.title")}</span>
            <span className="flex items-center gap-1.5">
              <ConfidenceBadge confiance={extraction.confiance} />
              <InfoTip>
                {t("metadata.confidenceTip")}
              </InfoTip>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MetadataForm value={form.meta} onChange={form.updateMeta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("grid.title")}{" "}
            <InfoTip>
              {t("grid.titleTip")}
            </InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CncGridEditor
            grilleCnc={form.grilleCnc}
            totalDevis={form.totalDevis}
            extractedTotal={extraction.total_devis}
            classifiedItems={form.classifiedItems}
            ccRates={ccRates}
            onUpdateGrille={form.updateGrilleCnc}
            onUpdatePersonnelLine={form.updatePersonnelLine}
            onAddLine={form.addLine}
            onDeleteLine={form.deleteLine}
            onUpdateClassifiedLine={form.updateClassifiedLine}
            onRemoveClassifiedLine={form.removeClassifiedLine}
            onMoveLine={form.moveLine}
          />
        </CardContent>
      </Card>

      {form.postesNonClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("unclassified.title")}{" "}
              <InfoTip>
                {t("unclassified.titleTip")}
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnclassifiedSection
              items={form.postesNonClasses}
              onClassify={form.classifyItem}
            />
          </CardContent>
        </Card>
      )}

      <div className="h-4" />
    </div>
  );

  return (
    <AppShell footer={footerActions} fullWidth={showPdf}>
      {showPdf ? (
        <div className="grid h-full grid-cols-2">
          <div className="overflow-y-auto px-4 py-6">
            {editorContent}
          </div>
          <PdfViewerPanel productionId={productionId} />
        </div>
      ) : (
        editorContent
      )}
    </AppShell>
  );
}
