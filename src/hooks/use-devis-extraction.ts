"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DevisExtraction } from "@/lib/schemas/devis";
import { SSEParser } from "@/lib/streaming/sse";
import { extractJsonString } from "@/lib/streaming/json-extract";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

export type ExtractionState = "idle" | "extracting" | "complete" | "error";

export type ExtractionPhase = "idle" | "reading" | "classifying" | "saving" | "complete" | "error";

interface UseDevisExtractionReturn {
  state: ExtractionState;
  phase: ExtractionPhase;
  partialResult: DeepPartial<DevisExtraction> | null;
  draftId: number | null;
  fileHash: string | null;
  error: string | null;
  extract: (file: File) => Promise<void>;
  reset: () => void;
}

export function tryParsePartial(text: string): DeepPartial<DevisExtraction> | null {
  const cleaned = extractJsonString(text);
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    let attempt = cleaned;

    const lastComplete = Math.max(
      attempt.lastIndexOf(","),
      attempt.lastIndexOf("["),
      attempt.lastIndexOf("{"),
    );
    if (lastComplete > 0) {
      const lastChar = attempt[lastComplete];
      attempt = lastChar === ","
        ? attempt.slice(0, lastComplete)
        : attempt.slice(0, lastComplete + 1);
    }

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;
    for (const char of attempt) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === "{") openBraces++;
      if (char === "}") openBraces--;
      if (char === "[") openBrackets++;
      if (char === "]") openBrackets--;
    }

    attempt += "]".repeat(Math.max(0, openBrackets));
    attempt += "}".repeat(Math.max(0, openBraces));

    try {
      return JSON.parse(attempt);
    } catch {
      return null;
    }
  }
}

export function useDevisExtraction(): UseDevisExtractionReturn {
  const [state, setState] = useState<ExtractionState>("idle");
  const [partialResult, setPartialResult] = useState<DeepPartial<DevisExtraction> | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamDone, setStreamDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const extract = useCallback(async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("extracting");
    setPartialResult(null);
    setDraftId(null);
    setFileHash(null);
    setError(null);
    setStreamDone(false);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      const sseParser = new SSEParser();
      let accumulated = "";
      let serverError: string | null = null;
      let receivedDraftId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const events = sseParser.feed(decoder.decode(value, { stream: true }));
        for (const event of events) {
          if (event.type === "hash") {
            setFileHash(event.data);
          } else if (event.type === "error") {
            serverError = event.data;
          } else if (event.type === "draft") {
            const data = JSON.parse(event.data);
            receivedDraftId = data.productionId;
            setDraftId(data.productionId);
          } else {
            accumulated += event.data;
          }
        }

        if (accumulated) {
          const parsed = tryParsePartial(accumulated);
          if (parsed) {
            setPartialResult(parsed);
          }
        }
      }

      setStreamDone(true);

      if (serverError) {
        throw new Error(serverError);
      }

      if (!receivedDraftId) {
        throw new Error("DRAFT_NOT_CREATED");
      }

      setState("complete");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
    setPartialResult(null);
    setDraftId(null);
    setFileHash(null);
    setError(null);
    setStreamDone(false);
  }, []);

  const phase: ExtractionPhase = useMemo(() => {
    if (state === "idle") return "idle";
    if (state === "error") return "error";
    if (state === "complete") return "complete";
    if (streamDone) return "saving";
    if (partialResult) return "classifying";
    return "reading";
  }, [state, partialResult, streamDone]);

  return { state, phase, partialResult, draftId, fileHash, error, extract, reset };
}
