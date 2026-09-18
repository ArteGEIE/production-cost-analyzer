/**
 * Extract and parse JSON from LLM output that may contain markdown fences or preamble.
 */
export function extractJsonString(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  if (firstBrace !== -1) {
    return text.slice(firstBrace);
  }

  return text;
}

export function tryParseJson(text: string): unknown | null {
  const cleaned = extractJsonString(text);
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
