import { Mistral } from "@mistralai/mistralai";
import { extractText, getDocumentProxy } from "unpdf";

import { log } from "@/lib/logger";

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  log.warn("MISTRAL_API_KEY is not set — PDF OCR fallback will fail for scanned documents.");
}

const ocrModel = process.env.OCR_MODEL ?? "mistral-ocr-latest";

const MIN_TEXT_LENGTH = 50;

/**
 * Extract text from a PDF buffer.
 * Strategy: try direct text extraction first (fast, free, accurate for text-based PDFs).
 * Falls back to Mistral OCR for scanned/image-only PDFs.
 */
export async function extractPdfText(buffer: ArrayBuffer | Buffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  const t0 = performance.now();
  const directText = await extractTextDirect(bytes);
  const directMs = (performance.now() - t0).toFixed(0);

  if (directText.length >= MIN_TEXT_LENGTH) {
    log.info(`PDF text extraction (direct) in ${directMs}ms (${directText.length} chars)`);
    return directText;
  }

  log.info(`PDF has no extractable text (${directText.length} chars) — falling back to Mistral OCR`);
  const t1 = performance.now();
  const ocrText = await extractTextOcr(bytes);
  const ocrMs = (performance.now() - t1).toFixed(0);
  log.info(`PDF OCR (Mistral) in ${ocrMs}ms (${ocrText.length} chars)`);

  return ocrText;
}

async function extractTextDirect(bytes: Uint8Array): Promise<string> {
  try {
    const doc = await getDocumentProxy(bytes);
    const { text } = await extractText(doc, { mergePages: true });
    return text;
  } catch (err) {
    log.debug("Direct text extraction failed:", err);
    return "";
  }
}

async function extractTextOcr(bytes: Uint8Array): Promise<string> {
  const client = new Mistral({ apiKey: mistralApiKey ?? "" });
  const base64 = Buffer.from(bytes).toString("base64");

  const response = await client.ocr.process({
    model: ocrModel,
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${base64}`,
    },
    includeImageBase64: false,
  });

  const pages = response.pages ?? [];
  return pages.map((p) => p.markdown).join("\n\n---\n\n");
}
