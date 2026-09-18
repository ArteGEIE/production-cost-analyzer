"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, RotateCcw } from "lucide-react";

import { UploadZone } from "@/components/upload-zone";
import { ExtractionResults } from "@/components/extraction-results";
import { ExtractionStatus } from "@/components/extraction-status";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoTip } from "@/components/ui/info-tip";
import { useDevisExtraction } from "@/hooks/use-devis-extraction";

export default function ImportPage() {
  const t = useTranslations("upload.page");
  const tErrors = useTranslations("upload.errors");
  const { state, phase, partialResult, draftId, error, extract, reset } =
    useDevisExtraction();
  const router = useRouter();
  const displayedError = error === "DRAFT_NOT_CREATED" ? tErrors("draftNotCreated") : error;

  const handleFileSelected = useCallback(
    (file: File) => {
      extract(file);
    },
    [extract],
  );

  useEffect(() => {
    if (draftId && state === "complete") {
      router.push(`/review?id=${draftId}`);
    }
  }, [draftId, state, router]);

  const footerContent =
    state !== "idle" ? (
      <div className="flex items-center justify-between">
        <ExtractionStatus phase={phase} />
        <div className="flex items-center gap-2">
          {state === "extracting" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              {t("cancel")}
            </Button>
          )}
          {(state === "complete" || state === "error") && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-4" />
              {t("newQuote")}
            </Button>
          )}
        </div>
      </div>
    ) : undefined;

  return (
    <AppShell footer={footerContent}>
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("subtitle")}{" "}
          <InfoTip>
            {t("subtitleTip")}
          </InfoTip>
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {state !== "complete" && (
          <UploadZone
            onFileSelected={handleFileSelected}
            disabled={state === "extracting"}
            loading={state === "extracting"}
          />
        )}

        {state === "extracting" && partialResult && (
          <ExtractionResults data={partialResult} isStreaming />
        )}

        {state === "error" && error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{t("extractionErrorTitle")}</AlertTitle>
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        {state === "complete" && partialResult && (
          <ExtractionResults data={partialResult} />
        )}
      </div>
    </AppShell>
  );
}
