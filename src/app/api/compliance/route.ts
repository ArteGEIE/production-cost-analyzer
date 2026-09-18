import { llmClient, llmModel } from "@/lib/ai/client";
import { buildCompliancePrompt, buildComplianceUserMessage } from "@/lib/ai/compliance-prompt";
import { computeCompliance } from "@/lib/anomalies/anomaly-engine";
import { devisExtractionSchema } from "@/lib/schemas/devis";
import { updateQualitativeAnalysis, getProductionById } from "@/lib/db/queries";
import { getCcMinimums } from "@/lib/db/queries-cc";
import { getThresholdConfig } from "@/lib/db/queries-settings";
import { log } from "@/lib/logger";
import { sseData, sseComment } from "@/lib/streaming/sse";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("productionId");
  if (!raw) {
    return Response.json({ error: "Missing productionId" }, { status: 400 });
  }
  const productionId = Number(raw);
  if (!Number.isInteger(productionId) || productionId < 1) {
    return Response.json({ error: "Invalid productionId" }, { status: 400 });
  }

  const production = await getProductionById(productionId);
  if (!production?.qualitativeAnalysis) {
    return Response.json({ cached: false });
  }

  return Response.json({ cached: true, text: production.qualitativeAnalysis });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { extraction: rawExtraction, productionId: rawProdId } = body as {
    extraction: unknown;
    productionId?: unknown;
  };
  const productionId = typeof rawProdId === "number" && Number.isInteger(rawProdId) && rawProdId > 0
    ? rawProdId
    : undefined;

  const parsed = devisExtractionSchema.safeParse(rawExtraction);
  if (!parsed.success) {
    log.warn("Compliance analysis: invalid extraction data", parsed.error.message);
    return new Response(JSON.stringify({ error: "Données d'extraction invalides" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const extraction = parsed.data;
  const ccRates = await getCcMinimums(extraction.meta.date_devis ?? undefined);
  const thresholds = await getThresholdConfig();
  const compliance = computeCompliance(extraction, ccRates, thresholds);

  log.info(`Compliance analysis: starting qualitative review with model=${llmModel}`);

  const t0 = performance.now();
  const stream = await llmClient.chat.completions.create(
    {
      model: llmModel,
      stream: true,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: "system", content: buildCompliancePrompt() },
        { role: "user", content: buildComplianceUserMessage(extraction, compliance) },
      ],
    },
    { signal: req.signal },
  );

  let totalChunks = 0;
  let accumulated = "";
  let cancelled = false;

  const readable = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        if (!cancelled) {
          try { controller.enqueue(sseComment()); } catch { /* client gone */ }
        }
      }, 5000);

      try {
        for await (const chunk of stream) {
          if (cancelled) break;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            totalChunks++;
            accumulated += delta;
            controller.enqueue(sseData(delta));
          }
        }
        const ms = (performance.now() - t0).toFixed(0);
        log.info(`Compliance analysis complete in ${ms}ms (${totalChunks} chunks)`);

        if (productionId && accumulated) {
          updateQualitativeAnalysis(productionId, accumulated).catch((err) =>
            log.error("Failed to persist qualitative analysis:", err),
          );
        }
      } catch (err) {
        if (!cancelled) log.error("Compliance analysis stream error:", err);
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
