import { describe, expect, it } from "vitest";
import { buildCompliancePrompt, buildComplianceUserMessage } from "./compliance-prompt";
import type { DevisExtraction } from "@/lib/schemas/devis";
import type { ComplianceResult } from "@/lib/anomalies/anomaly-engine";

const baseExtraction: DevisExtraction = {
  meta: {
    producteur: "TestProd",
    titre: "Test Film",
    duree_minutes: 52,
    type_production: "Documentaire 52min",
  },
  grille_cnc: {
    "1_droits_artistiques": { lignes: [], total: 5000 },
    "2_personnel": { postes: [], total: 5000 },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": { lignes: [], taux_moyen: 0.55, total: 2750 },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": { lignes: [], total: 2000 },
    "7_tournage": { lignes: [], total: 1500 },
    "8_post_production": { lignes: [], total: 2000 },
    "9_assurance": { lignes: [], total: 500 },
    "10_imprevus_fg_pd": { lignes: [], total: 3000 },
  },
  total_devis: 21750,
  cout_minute: 418.27,
  verification_minima: [],
  anomalies: [],
  postes_non_classes: [],
  confiance: "haute",
};

const baseCompliance: ComplianceResult = {
  verificationMinima: [
    { poste: "Chef op", tarif_journalier: 350, minimum_cc: 281.54, ecart_pourcent: 24.32, statut: "conforme" },
  ],
  anomalies: [
    { code: "R6", severite: "ATTENTION", params: { rate: "35.0" } },
  ],
};

describe("buildCompliancePrompt", () => {
  it("returns a non-empty system prompt mentioning qualitative analysis", () => {
    const prompt = buildCompliancePrompt();
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain("qualitative");
    expect(prompt).toContain("R1, R3-R7");
  });
});

describe("buildComplianceUserMessage", () => {
  it("includes extraction metadata and CNC totals", () => {
    const msg = buildComplianceUserMessage(baseExtraction, baseCompliance);
    expect(msg).toContain("TestProd");
    expect(msg).toContain("Documentaire 52min");
    expect(msg).toContain("21750");
  });

  it("includes engine anomalies", () => {
    const msg = buildComplianceUserMessage(baseExtraction, baseCompliance);
    expect(msg).toContain("[R6/ATTENTION]");
    expect(msg).toContain("Taux de charges sociales bas : 35.0%");
  });

  it("includes verification minima", () => {
    const msg = buildComplianceUserMessage(baseExtraction, baseCompliance);
    expect(msg).toContain("Chef op");
    expect(msg).toContain("conforme");
  });

  it("handles empty anomalies gracefully", () => {
    const empty: ComplianceResult = { verificationMinima: [], anomalies: [] };
    const msg = buildComplianceUserMessage(baseExtraction, empty);
    expect(msg).toContain("Aucune non-conformité détectée");
  });
});
