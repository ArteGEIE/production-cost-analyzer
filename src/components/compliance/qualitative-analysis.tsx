"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, AlertCircle, RotateCcw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { DevisExtraction } from "@/lib/schemas/devis";
import { SSEParser } from "@/lib/streaming/sse";

interface QualitativeAnalysisProps {
  extraction: DevisExtraction;
  productionId: number | null;
  cachedAnalysis?: string | null;
}

type Status = "idle" | "loading" | "streaming" | "done" | "error";

export function QualitativeAnalysis({ extraction, productionId, cachedAnalysis }: QualitativeAnalysisProps) {
  const t = useTranslations("compliance.qualitativeAnalysis");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAnalysis = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction, productionId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t("defaultError") }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      setStatus("streaming");
      const reader = res.body?.getReader();
      if (!reader) throw new Error(t("noResponseBody"));

      const decoder = new TextDecoder();
      const sseParser = new SSEParser();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const events = sseParser.feed(decoder.decode(value, { stream: true }));
        for (const event of events) {
          accumulated += event.data;
        }
        setText(accumulated);
      }

      setStatus("done");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : t("defaultError"));
      setStatus("error");
    }
  }, [extraction, productionId, t]);

  useEffect(() => {
    if (cachedAnalysis) {
      setText(cachedAnalysis);
      setStatus("done");
    } else {
      fetchAnalysis();
    }
    return () => abortRef.current?.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount; "Relancer" calls fetchAnalysis directly
  }, [cachedAnalysis]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {t("title")}
          </span>
          {status === "done" && (
            <Button variant="ghost" size="sm" onClick={fetchAnalysis}>
              <RotateCcw className="size-3.5" />
              {t("rerun")}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion>
          <AccordionItem value="how-it-works" className="border-b-0">
            <AccordionTrigger className="py-0 text-xs text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5" />
                {t("howItWorksTrigger")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-2 mt-2">
                <p className="font-medium text-foreground">{t("stepsIntro")}</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>{t.rich("step1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("step2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("step3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                </ol>
                <p className="font-medium text-foreground mt-3">{t("basedOnIntro")}</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>{t.rich("source1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("source2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("source3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("source4", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardContent>
        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="size-4 animate-spin" />
            {t("loading")}
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalysis}>
              <RotateCcw className="size-3.5" />
              {t("retry")}
            </Button>
          </div>
        )}

        {(status === "streaming" || status === "done") && (
          <div className="prose prose-sm max-w-none">
            <MarkdownLite text={text} />
            {status === "streaming" && (
              <span className="inline-block size-2 rounded-full bg-foreground/50 animate-pulse ml-1" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Minimal markdown renderer — handles ###, **, -, and paragraphs.
 * No dependency needed for this limited subset.
 */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold mt-4 mb-1 first:mt-0">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="text-sm text-muted-foreground ml-4 list-disc">
          <InlineBold text={line.slice(2)} />
        </li>,
      );
    } else if (line.trim() === "") {
      elements.push(<br key={key++} />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-muted-foreground">
          <InlineBold text={line} />
        </p>,
      );
    }
  }

  return <>{elements}</>;
}

/** Render **bold** segments within text */
function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-medium text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
