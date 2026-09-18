import { describe, expect, it } from "vitest";

import { extractJsonString } from "@/lib/streaming/json-extract";
import { tryParsePartial } from "./use-devis-extraction";

describe("extractJsonString", () => {
  it("should return plain JSON as-is", () => {
    const json = '{"meta":{"producteur":"Test"}}';
    expect(extractJsonString(json)).toBe(json);
  });

  it("should strip ```json code fences", () => {
    const input = '```json\n{"total": 1000}\n```';
    expect(extractJsonString(input)).toBe('{"total": 1000}');
  });

  it("should strip ``` code fences without language", () => {
    const input = '```\n{"total": 1000}\n```';
    expect(extractJsonString(input)).toBe('{"total": 1000}');
  });

  it("should strip leading prose before JSON", () => {
    const input = 'Voici le résultat:\n\n{"total": 1000}';
    expect(extractJsonString(input)).toBe('{"total": 1000}');
  });

  it("should strip trailing text after JSON", () => {
    const input = '{"total": 1000}\n\nJ\'espère que cela vous aide.';
    expect(extractJsonString(input)).toBe('{"total": 1000}');
  });

  it("should handle fences with leading prose", () => {
    const input = 'Here is the extraction:\n```json\n{"total": 1000}\n```\nDone.';
    expect(extractJsonString(input)).toBe('{"total": 1000}');
  });

  it("should handle partial streaming (no closing brace)", () => {
    const input = '{"meta":{"producteur":"Test"';
    expect(extractJsonString(input)).toBe('{"meta":{"producteur":"Test"');
  });

  it("should return text unchanged if no JSON found", () => {
    const input = "No JSON here";
    expect(extractJsonString(input)).toBe(input);
  });
});

describe("tryParsePartial", () => {
  it("should parse complete valid JSON", () => {
    const json = '{"meta":{"producteur":"Test"},"total_devis":50000}';
    const result = tryParsePartial(json);
    expect(result).toEqual({ meta: { producteur: "Test" }, total_devis: 50000 });
  });

  it("should parse JSON wrapped in code fences", () => {
    const input = '```json\n{"total_devis": 1000}\n```';
    const result = tryParsePartial(input);
    expect(result).toEqual({ total_devis: 1000 });
  });

  it("should parse JSON with leading prose", () => {
    const input = 'Voici le résultat:\n{"total_devis": 1000}';
    const result = tryParsePartial(input);
    expect(result).toEqual({ total_devis: 1000 });
  });

  it("should handle partial streaming with unclosed braces", () => {
    // The parser trims the last incomplete value before closing braces
    const input = '{"meta":{"producteur":"Les Films","titre":"Test"';
    const result = tryParsePartial(input);
    expect(result).toEqual({ meta: { producteur: "Les Films" } });
  });

  it("should handle partial streaming with unclosed arrays", () => {
    const input = '{"postes_non_classes":["Poste A","Poste B","Poste C"';
    const result = tryParsePartial(input) as Record<string, unknown> | null;
    // Parser trims last incomplete element
    expect(result?.postes_non_classes).toBeDefined();
    expect((result!.postes_non_classes as string[]).length).toBeGreaterThanOrEqual(1);
  });

  it("should handle partial streaming mid-value (trailing comma)", () => {
    const input = '{"meta":{"producteur":"Test","titre":';
    const result = tryParsePartial(input);
    expect(result).toEqual({ meta: { producteur: "Test" } });
  });

  it("should handle strings with escaped quotes", () => {
    const input = '{"meta":{"titre":"L\\"Europe"}}';
    const result = tryParsePartial(input);
    expect(result).toEqual({ meta: { titre: 'L"Europe' } });
  });

  it("should handle nested objects and arrays", () => {
    const input = '{"grille_cnc":{"1_droits":{"total":3500},"2_personnel":{"total":10000}}}';
    const result = tryParsePartial(input);
    expect(result?.grille_cnc).toBeDefined();
  });

  it("should return null for completely invalid input", () => {
    expect(tryParsePartial("not json at all")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(tryParsePartial("")).toBeNull();
  });
});
