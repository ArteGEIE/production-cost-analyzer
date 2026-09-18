import OpenAI from "openai";

import { log } from "@/lib/logger";

/**
 * OpenAI-compatible client.
 *
 * Requires an OpenAI-compatible endpoint. Set LLM_BASE_URL to:
 * - LiteLLM proxy: http://localhost:4000/v1
 * - Ollama: http://localhost:11434/v1
 * - OpenAI: https://api.openai.com/v1
 *
 * Does NOT work with Anthropic's native API directly — use LiteLLM as a proxy.
 */

const baseURL = process.env.LLM_BASE_URL;
if (!baseURL) {
  log.warn("LLM_BASE_URL is not set — LLM calls will fail. Set it to an OpenAI-compatible endpoint (e.g. LiteLLM proxy).");
}

export const llmClient = new OpenAI({
  baseURL: baseURL ?? "http://localhost:4000/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
});

/** LLM model for extraction, classification, and compliance analysis */
export const llmModel = process.env.LLM_MODEL ?? process.env.LLM_MODEL_CLASSIFY ?? "claude-sonnet-4-6";

log.debug(`LLM client: baseURL=${baseURL ?? "(not set)"} model=${llmModel}`);
