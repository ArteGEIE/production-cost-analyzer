"use client";

import { useTranslations } from "next-intl";

interface PdfViewerPanelProps {
  productionId: number;
}

export function PdfViewerPanel({ productionId }: PdfViewerPanelProps) {
  const t = useTranslations("pdfViewerPanel");
  return (
    <div className="h-full border-l">
      <iframe
        src={`/api/files/${productionId}`}
        className="h-full w-full"
        title={t("title")}
      />
    </div>
  );
}
