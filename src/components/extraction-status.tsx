"use client";

import { useTranslations } from "next-intl";
import type { ExtractionPhase } from "@/hooks/use-devis-extraction";

interface ExtractionStatusProps {
  phase: ExtractionPhase;
}

export function ExtractionStatus({ phase }: ExtractionStatusProps) {
  const t = useTranslations("upload.status");
  const phaseLabels: Record<ExtractionPhase, string> = {
    idle: "",
    reading: t("reading"),
    classifying: t("classifying"),
    saving: t("saving"),
    complete: t("complete"),
    error: t("error"),
  };
  const label = phaseLabels[phase];
  if (!label) return null;

  const isActive = phase === "reading" || phase === "classifying" || phase === "saving";

  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      {isActive && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
        </span>
      )}
      {phase === "complete" && (
        <span className="inline-flex size-2 rounded-full bg-green-500" />
      )}
      {phase === "error" && (
        <span className="inline-flex size-2 rounded-full bg-red-500" />
      )}
      {label}
    </span>
  );
}
