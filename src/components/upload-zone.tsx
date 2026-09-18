"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileText, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 0.1) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${mb.toFixed(1)} Mo`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export type PdfValidationError = "invalidType" | "tooLarge";

/** Returns null if valid, error code if invalid. Translate at the display site. */
export function validatePdfFile(file: File): PdfValidationError | null {
  if (file.type !== "application/pdf") {
    return "invalidType";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "tooLarge";
  }
  return null;
}

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function UploadZone({ onFileSelected, disabled, loading }: UploadZoneProps) {
  const t = useTranslations("upload.zone");
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validatePdfFile(file);
      if (validationError) {
        setError(t(`errors.${validationError}`));
        return;
      }
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  return (
    <Card
      className={cn(
        "cursor-pointer border-2 border-dashed transition-colors",
        isDragOver && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-60",
        error && "border-destructive",
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <CardContent className="flex flex-col items-center gap-3 py-10">
        {loading && selectedFile ? (
          <>
            <Loader2 className="size-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-medium">{t("analyzing")}</p>
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} — {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </>
        ) : selectedFile && !error ? (
          <>
            <FileText className="size-10 text-primary" />
            <div className="text-center">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="size-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">
                {t("dropInstructions")}
              </p>
              <p className="text-sm text-muted-foreground">{t("maxSize")}</p>
            </div>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
