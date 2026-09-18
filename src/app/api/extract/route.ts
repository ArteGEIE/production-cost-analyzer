import { auth } from "@/lib/auth";
import { llmClient, llmModel } from "@/lib/ai/client";
import { buildExtractionPrompt } from "@/lib/ai/extraction-prompt";
import { log } from "@/lib/logger";
import { extractPdfText } from "@/lib/pdf/pdf-text";
import { getDistinctProducteurs, insertProduction, insertProductionFile, deleteDraftsByFileHash, deleteStaleDrafts } from "@/lib/db/queries";
import { productionTypes } from "@/lib/config/production-types";
import { devisExtractionSchema } from "@/lib/schemas/devis";
import { tryParseJson } from "@/lib/streaming/json-extract";
import { sseData, sseEvent, sseComment } from "@/lib/streaming/sse";

export const maxDuration = 120;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// GDPR: a draft's source PDF only needs to outlive the import/review
// session. Drafts left unpublished past this window are purged (cascading their
// stored PDF) on the next extraction, so no source PDF lingers indefinitely.
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await req.formData();
  const file = formData.get("pdf");

  if (!file || !(file instanceof File)) {
    log.warn("Extract request with no PDF file");
    return new Response(JSON.stringify({ error: "No PDF file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  log.info(`Upload received: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);

  if (file.size > MAX_FILE_SIZE) {
    log.warn(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    return new Response(
      JSON.stringify({ error: "File exceeds 20MB limit" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (file.type !== "application/pdf") {
    log.warn(`Invalid file type: ${file.type}`);
    return new Response(
      JSON.stringify({ error: "Only PDF files are accepted" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Hash the PDF for duplicate detection ---
  const arrayBuffer = await file.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBuffer);
  const fileHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // --- Extract text from PDF ---
  const t0 = performance.now();
  const pdfText = await extractPdfText(pdfBuffer);
  const pdfMs = (performance.now() - t0).toFixed(0);

  if (!pdfText.trim()) {
    log.warn("PDF OCR returned empty — possibly blank or corrupted PDF");
    return new Response(
      JSON.stringify({ error: "Impossible d'extraire le texte du PDF." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  log.info(`PDF OCR complete in ${pdfMs}ms (${pdfText.length} chars)`);
  log.debug("OCR preview:", pdfText.substring(0, 200));

  // --- LLM: Extract, classify, and analyze (single pass, streamed) ---
  log.info(`LLM extraction with model=${llmModel}`);
  const t1 = performance.now();

  const existingProducers = await getDistinctProducteurs();
  log.info(`Loaded ${existingProducers.length} existing producers for matching`);

  const systemPrompt = await buildExtractionPrompt({
    existingProducers,
    productionTypes: [...productionTypes.filter((t) => t !== "Autre")],
  });

  const stream = await llmClient.chat.completions.create(
    {
      model: llmModel,
      stream: true,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Voici le contenu du devis PDF extrait par OCR (format markdown avec tableaux préservés) :\n\n---\n${pdfText}\n---\n\nExtrais, classifie selon la grille CNC et produis l'analyse complète.`,
        },
      ],
    },
    { signal: req.signal },
  );

  let totalChunks = 0;
  let accumulated = "";
  let cancelled = false;

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent("hash", fileHash));

      const heartbeat = setInterval(() => {
        if (!cancelled) {
          try { controller.enqueue(sseComment()); } catch { /* client gone */ }
        }
      }, 5000);

      try {
        let finishReason: string | null = null;
        for await (const chunk of stream) {
          if (cancelled) break;
          const choice = chunk.choices[0];
          if (choice?.finish_reason) finishReason = choice.finish_reason;
          const delta = choice?.delta?.content;
          if (delta) {
            totalChunks++;
            accumulated += delta;
            controller.enqueue(sseData(delta));
          }
        }
        const llmMs = (performance.now() - t1).toFixed(0);
        log.info(`LLM stream complete in ${llmMs}ms (${totalChunks} chunks, ${accumulated.length} chars, finish=${finishReason})`);
        log.debug("LLM response ends with:", accumulated.substring(accumulated.length - 100));
        if (finishReason === "length") {
          log.warn("LLM output truncated — max_tokens reached");
          controller.enqueue(sseEvent("error", "Extraction tronquée : le devis est trop complexe pour être analysé en une seule passe. Veuillez réessayer."));
        } else if (!cancelled) {
          // --- Server-side: parse JSON, create draft, store PDF ---
          const parsed = tryParseJson(accumulated);
          const validation = devisExtractionSchema.safeParse(parsed);

          if (validation.success) {
            // Best-effort housekeeping: a failed stale-draft purge must never
            // block the user's import — log and carry on, it retries next time.
            try {
              const purged = await deleteStaleDrafts(new Date(Date.now() - DRAFT_TTL_MS).toISOString());
              if (purged > 0) log.info(`Purged ${purged} stale draft(s) and their source PDFs`);
            } catch (purgeErr) {
              log.warn("Stale draft purge failed (continuing):", purgeErr);
            }
            try {
              await deleteDraftsByFileHash(fileHash);
              const productionId = await insertProduction(validation.data, {
                user: { userId: session.user.id, userName: session.user.name },
                fileHash,
                status: "draft",
              });
              await insertProductionFile(productionId, file.name, "application/pdf", pdfBuffer);
              log.info(`Draft production created: id=${productionId}`);
              controller.enqueue(sseEvent("draft", JSON.stringify({ productionId })));
            } catch (err) {
              log.error("Failed to create draft production:", err);
              controller.enqueue(sseEvent("error", "Erreur lors de la création du brouillon."));
            }
          } else {
            log.warn("Extraction result does not match schema:", validation.error.message);
            controller.enqueue(sseEvent("error", "L'extraction n'a pas produit un résultat valide. Veuillez réessayer."));
          }
        }
      } catch (err) {
        if (!cancelled) log.error("LLM stream error:", err);
      } finally {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed by client disconnect */ }
      }
    },
    cancel() {
      cancelled = true;
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
