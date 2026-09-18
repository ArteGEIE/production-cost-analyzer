# LLM Extraction Pipeline

Single-pass pipeline for extracting and normalizing budget data from PDF estimates.

```mermaid
graph LR
    PDF[PDF Upload] --> OCR[Mistral OCR<br/>PDF → markdown]
    OCR --> LLM[LLM: Extract + Classify<br/>configurable model]
    LLM --> UI[Streaming Results]

    style OCR fill:#e8f4e8
    style LLM fill:#e8e8f4
```

## How it works

1. **Mistral OCR** converts the PDF to structured markdown (preserving tables and layout)
2. **LLM** (Claude Sonnet by default, configurable via `LLM_MODEL`) receives the markdown and in a single pass:
   - Extracts every line item with amounts, quantities, unit costs
   - Classifies each line into the CNC 10-category grid
   - Verifies daily rates against CC minimums
   - Detects structural anomalies (R1, R3–R7)
   - Outputs the UC3-CNC-Devis-v1 JSON schema

The LLM response is **streamed** to the client, so the user sees progressive results.

## Configuration

Requires an OpenAI-compatible endpoint. Does **not** work with Anthropic's native API directly — use [LiteLLM](https://docs.litellm.ai/) as a proxy.

```bash
# .env
LLM_BASE_URL=http://localhost:4000/v1
LLM_API_KEY=sk-1234
LLM_MODEL=claude-sonnet-4-6

# Mistral OCR (required for PDF text extraction)
MISTRAL_API_KEY=your-key
```

## Files

| File | Role |
|------|------|
| `client.ts` | OpenAI-compatible client + model config |
| `extraction-prompt.ts` | System prompt (extraction + CNC classification + compliance) |
| `compliance-prompt.ts` | Qualitative compliance analysis prompt |
| `../pdf/pdf-text.ts` | PDF → text extraction (Mistral OCR) |
| `../../app/api/extract/route.ts` | API route orchestrating OCR + LLM |
