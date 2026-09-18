import { beforeAll, describe, expect, it, vi } from "vitest";
import { CC_FALLBACK_RATES } from "@/lib/config/cc-minimums";
import { DEFAULT_CNC_MAPPING } from "@/lib/config/cnc-mapping";
import { DEFAULT_STRUCTURAL_THRESHOLDS, DEFAULT_R6_MIN_RATE, DEFAULT_R7_MAX_DEVIATION } from "@/lib/config/structural-thresholds";

vi.mock("@/lib/db/queries-cc", () => ({
  getCcMinimums: vi.fn().mockResolvedValue(CC_FALLBACK_RATES),
}));

vi.mock("@/lib/db/queries-settings", () => ({
  getCncMapping: vi.fn().mockResolvedValue([...DEFAULT_CNC_MAPPING]),
  getThresholdConfig: vi.fn().mockResolvedValue({
    structural: DEFAULT_STRUCTURAL_THRESHOLDS,
    r6MinRate: DEFAULT_R6_MIN_RATE,
    r7MaxDeviation: DEFAULT_R7_MAX_DEVIATION,
  }),
}));

import { buildExtractionPrompt } from "./extraction-prompt";

describe("buildExtractionPrompt", () => {
  let prompt: string;

  beforeAll(async () => {
    prompt = await buildExtractionPrompt();
  });

  it("should instruct extraction from OCR markdown input", () => {
    expect(prompt).toContain("extrait par OCR");
    expect(prompt).toContain("markdown");
    expect(prompt).toContain("Extrais CHAQUE ligne");
  });

  it("should handle multilingual budgets", () => {
    expect(prompt).toContain("allemand");
    expect(prompt).toContain("anglais");
  });

  it("should include all 10 CNC categories with examples", () => {
    for (let i = 1; i <= 10; i++) {
      expect(prompt).toContain(`${i}.`);
    }
    expect(prompt).toContain("Droits artistiques");
    expect(prompt).toContain("Post-production");
    expect(prompt).toContain("salle de montage");
    expect(prompt).toContain("drone");
  });

  it("should include the job mapping table with FR/DE/EN labels", () => {
    expect(prompt).toContain("Kameramann");
    expect(prompt).toContain("Director of Photography");
    expect(prompt).toContain("Chef opérateur");
    expect(prompt).toContain("Tonmeister");
    expect(prompt).toContain("Sound Engineer");
  });

  it("should include new roles from reference prompt", () => {
    expect(prompt).toContain("Rédacteur en chef");
    expect(prompt).toContain("Stringer / Fixeur");
    expect(prompt).toContain("JRI");
    expect(prompt).toContain("Doublage / Speaker");
    expect(prompt).toContain("Editing suite");
    expect(prompt).toContain("Mixing studio");
  });

  it("should include CC minimums", () => {
    expect(prompt).toContain("219.58");
    expect(prompt).toContain("281.54");
    expect(prompt).toContain("303.46");
    expect(prompt).toContain("Directeur de production");
  });

  it("should include all 6 anomaly rules", () => {
    for (const code of ["R1", "R3", "R4", "R5", "R6", "R7"]) {
      expect(prompt).toContain(code);
    }
  });

  it("should include critical instructions for category disambiguation", () => {
    expect(prompt).toContain("Ne confonds pas les catégories 7");
    expect(prompt).toContain("catégorie 8");
    expect(prompt).toContain("traduction va en catégorie 1");
    expect(prompt).toContain("sociétés étrangères");
  });

  it("should include verification rules for forfaits, prestataires and foreign companies", () => {
    expect(prompt).toContain("non_verifiable_forfait");
    expect(prompt).toContain("non_verifiable_prestataire");
    expect(prompt).toContain("non_verifiable_etranger");
    expect(prompt).toContain("type_contrat");
  });

  it("should include JSON schema in the prompt", () => {
    expect(prompt).toContain("SCHÉMA JSON DE SORTIE");
    expect(prompt).toContain('"type": "object"');
    expect(prompt).toContain("total_devis");
    expect(prompt).toContain("grille_cnc");
  });

  it("should include sum verification instruction", () => {
    expect(prompt).toContain("±1€");
  });
});
