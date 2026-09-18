import { describe, expect, it } from "vitest";
import {
  isNonConforme,
  computeVerificationMinima,
  computeR1,
  computeR3R4,
  computeR5,
  computeR6,
  computeR7,
  computeCompliance,
} from "./anomaly-engine";
import type { DevisExtraction, GrilleCnc, PersonnelLine } from "@/lib/schemas/devis";
import { CC_FALLBACK_RATES } from "@/lib/config/cc-minimums";
import { DEFAULT_STRUCTURAL_THRESHOLDS, DEFAULT_R6_MIN_RATE, DEFAULT_R7_MAX_DEVIATION } from "@/lib/config/structural-thresholds";
import type { ThresholdConfig } from "@/lib/db/queries-settings";

const testCcRates = CC_FALLBACK_RATES;

const testThresholds: ThresholdConfig = {
  structural: DEFAULT_STRUCTURAL_THRESHOLDS,
  r6MinRate: DEFAULT_R6_MIN_RATE,
  r7MaxDeviation: DEFAULT_R7_MAX_DEVIATION,
};

// --- Fixtures ---

const makePersonnel = (overrides: Partial<PersonnelLine> = {}): PersonnelLine => ({
  poste: "Chef opérateur",
  role_key: "cadreur_opv",
  nombre_jours: 10,
  tarif_journalier: 350,
  total: 3500,
  ...overrides,
});

const emptyCategory = { lignes: [], total: 0 };

const baseGrilleCnc: GrilleCnc = {
  "1_droits_artistiques": { lignes: [{ poste: "Auteur", montant: 5000 }], total: 5000 },
  "2_personnel": {
    postes: [makePersonnel()],
    total: 3500,
  },
  "3_interpretation": emptyCategory,
  "4_charges_sociales": { lignes: [{ poste: "Charges", montant: 2750 }], taux_moyen: 0.55, total: 2750 },
  "5_decors_costumes": emptyCategory,
  "6_transport": { lignes: [{ poste: "Transport", montant: 2000 }], total: 2000 },
  "7_tournage": { lignes: [{ poste: "Caméra", montant: 3000 }], total: 3000 },
  "8_post_production": { lignes: [{ poste: "Montage", montant: 2000 }], total: 2000 },
  "9_assurance": { lignes: [{ poste: "Assurance", montant: 500 }], total: 500 },
  "10_imprevus_fg_pd": { lignes: [{ poste: "Imprévus", montant: 3000 }], total: 3000 },
};

const baseExtraction: DevisExtraction = {
  meta: {
    producteur: "TestProd",
    titre: "Test Film",
    duree_minutes: 52,
    type_production: "Documentaire 52min",
  },
  grille_cnc: baseGrilleCnc,
  total_devis: 21750,
  cout_minute: 418.27,
  verification_minima: [],
  anomalies: [],
  postes_non_classes: [],
  confiance: "haute",
};

// --- isNonConforme (SPOT for CC compliance threshold) ---

describe("isNonConforme", () => {
  it("returns true when rate is below minimum", () => {
    expect(isNonConforme(250, 282)).toBe(true);
  });

  it("returns false when rate equals minimum", () => {
    expect(isNonConforme(282, 282)).toBe(false);
  });

  it("returns false when rate is above minimum", () => {
    expect(isNonConforme(300, 282)).toBe(false);
  });
});

// --- computeVerificationMinima ---

describe("computeVerificationMinima", () => {
  it("returns conforme when rate is well above minimum", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 350 })], testCcRates);
    expect(result).toHaveLength(1);
    expect(result[0].statut).toBe("conforme");
    expect(result[0].minimum_cc).toBe(281.54);
    expect(result[0].ecart_pourcent).toBeGreaterThan(5);
  });

  it("returns non_conforme when rate is below minimum", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 250 })], testCcRates);
    expect(result[0].statut).toBe("non_conforme");
    expect(result[0].ecart_pourcent).toBeLessThan(0);
  });

  it("returns conforme when rate equals minimum exactly", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 281.54 })], testCcRates);
    expect(result[0].statut).toBe("conforme");
    expect(result[0].ecart_pourcent).toBe(0);
  });

  it("returns conforme when rate is slightly above minimum", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 290 })], testCcRates);
    expect(result[0].statut).toBe("conforme");
  });

  it("returns non_verifiable_forfait when tarif is 0", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 0 })], testCcRates);
    expect(result[0].statut).toBe("non_verifiable_forfait");
    expect(result[0].minimum_cc).toBeNull();
  });

  it("returns hors_nomenclature for unknown role_key", () => {
    const result = computeVerificationMinima([makePersonnel({ role_key: "cascadeur" })], testCcRates);
    expect(result[0].statut).toBe("hors_nomenclature");
    expect(result[0].minimum_cc).toBeNull();
  });

  it("returns non_verifiable_prestataire when type_contrat is prestataire", () => {
    const result = computeVerificationMinima([
      makePersonnel({ type_contrat: "prestataire", tarif_journalier: 500 }),
    ], testCcRates);
    expect(result[0].statut).toBe("non_verifiable_prestataire");
    expect(result[0].minimum_cc).toBeNull();
    expect(result[0].ecart_pourcent).toBeNull();
  });

  it("returns non_verifiable_etranger when type_contrat is etranger", () => {
    const result = computeVerificationMinima([
      makePersonnel({ type_contrat: "etranger", tarif_journalier: 300 }),
    ], testCcRates);
    expect(result[0].statut).toBe("non_verifiable_etranger");
    expect(result[0].minimum_cc).toBeNull();
    expect(result[0].ecart_pourcent).toBeNull();
  });

  it("still checks CC minimums when type_contrat is salarie", () => {
    const result = computeVerificationMinima([
      makePersonnel({ type_contrat: "salarie", tarif_journalier: 350 }),
    ], testCcRates);
    expect(result[0].statut).toBe("conforme");
    expect(result[0].minimum_cc).toBe(281.54);
  });

  it("still checks CC minimums when type_contrat is null (default)", () => {
    const result = computeVerificationMinima([makePersonnel({ tarif_journalier: 350 })], testCcRates);
    expect(result[0].statut).toBe("conforme");
  });
});

// --- R1: CC minimum violations ---

describe("computeR1", () => {
  it("generates R1 for non_conforme entries", () => {
    const verif = computeVerificationMinima([makePersonnel({ tarif_journalier: 200 })], testCcRates);
    const anomalies = computeR1(verif);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].code).toBe("R1");
    expect(anomalies[0].severite).toBe("ÉLEVÉE");
  });

  it("generates nothing for rate near minimum", () => {
    const verif = computeVerificationMinima([makePersonnel({ tarif_journalier: 290 })], testCcRates);
    const anomalies = computeR1(verif);
    expect(anomalies).toHaveLength(0);
  });

  it("generates nothing for conforme entries", () => {
    const verif = computeVerificationMinima([makePersonnel({ tarif_journalier: 400 })], testCcRates);
    expect(computeR1(verif)).toHaveLength(0);
  });
});

// --- R3/R4 ---

describe("computeR3R4", () => {
  it("generates R3 when a category exceeds high threshold", () => {
    // Personnel at 60% of total (threshold high = 55%)
    const grille: GrilleCnc = {
      ...baseGrilleCnc,
      "2_personnel": { postes: [makePersonnel({ total: 12000 })], total: 12000 },
    };
    const anomalies = computeR3R4(grille, 20000, testThresholds.structural);
    const r3 = anomalies.filter((a) => a.code === "R3");
    expect(r3.length).toBeGreaterThanOrEqual(1);
    expect(r3.some((a) => a.params.label === "Personnel")).toBe(true);
  });

  it("generates R4 when a category is below low threshold", () => {
    // Droits artistiques at 1% of total (threshold low = 2%)
    const grille: GrilleCnc = {
      ...baseGrilleCnc,
      "1_droits_artistiques": { lignes: [{ poste: "Auteur", montant: 100 }], total: 100 },
    };
    const anomalies = computeR3R4(grille, 20000, testThresholds.structural);
    const r4 = anomalies.filter((a) => a.code === "R4");
    expect(r4.some((a) => a.params.label === "Droits artistiques")).toBe(true);
  });

  it("skips categories with zero total", () => {
    const grille: GrilleCnc = {
      ...baseGrilleCnc,
      "1_droits_artistiques": { lignes: [], total: 0 },
    };
    const anomalies = computeR3R4(grille, 20000, testThresholds.structural);
    expect(anomalies.every((a) => a.params.label !== "Droits artistiques")).toBe(true);
  });

  it("returns empty when totalDevis is 0", () => {
    expect(computeR3R4(baseGrilleCnc, 0, testThresholds.structural)).toHaveLength(0);
  });
});

// --- R5 ---

describe("computeR5", () => {
  it("generates R5 when social charges total is 0", () => {
    const result = computeR5({ lignes: [], taux_moyen: null, total: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("R5");
  });

  it("sets detailsParams so the localized R5Details message renders", () => {
    const result = computeR5({ lignes: [], taux_moyen: null, total: 0 });
    expect(result[0].detailsParams).toBeDefined();
  });

  it("returns empty when social charges exist", () => {
    expect(computeR5({ lignes: [], taux_moyen: 0.55, total: 2000 })).toHaveLength(0);
  });
});

// --- R6 ---

describe("computeR6", () => {
  it("generates R6 when taux_moyen < 50%", () => {
    const result = computeR6({ lignes: [], taux_moyen: 0.35, total: 1000 }, testThresholds.r6MinRate);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("R6");
  });

  it("sets detailsParams so the localized R6Details message renders", () => {
    const result = computeR6({ lignes: [], taux_moyen: 0.35, total: 1000 }, testThresholds.r6MinRate);
    expect(result[0].detailsParams).toBeDefined();
  });

  it("returns empty when taux_moyen >= 50%", () => {
    expect(computeR6({ lignes: [], taux_moyen: 0.55, total: 2000 }, testThresholds.r6MinRate)).toHaveLength(0);
  });

  it("returns empty when taux_moyen is null", () => {
    expect(computeR6({ lignes: [], taux_moyen: null, total: 2000 }, testThresholds.r6MinRate)).toHaveLength(0);
  });
});

// --- R7 ---

describe("computeR7", () => {
  it("returns empty when no history provided (backward compat)", () => {
    expect(computeR7(baseExtraction, undefined, testThresholds.r7MaxDeviation)).toHaveLength(0);
  });

  it("returns empty when history has fewer than 2 entries", () => {
    expect(computeR7(baseExtraction, [], testThresholds.r7MaxDeviation)).toHaveLength(0);
    expect(computeR7(baseExtraction, [400], testThresholds.r7MaxDeviation)).toHaveLength(0);
  });

  it("returns empty when cost/minute is within 30% of producer average", () => {
    // baseExtraction.cout_minute = 418.27
    // History avg = 450 → deviation = (418.27-450)/450 = -7% → within threshold
    expect(computeR7(baseExtraction, [400, 500], testThresholds.r7MaxDeviation)).toHaveLength(0);
  });

  it("returns R7 ATTENTION when cost/minute deviates >30% above average", () => {
    // History avg = 250 → deviation = (418.27-250)/250 = 67% → outlier
    const result = computeR7(baseExtraction, [200, 300], testThresholds.r7MaxDeviation);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("R7");
    expect(result[0].severite).toBe("ATTENTION");
    expect(result[0].params.coutMinute).toBe(418);
  });

  it("returns R7 ATTENTION when cost/minute deviates >30% below average", () => {
    // History avg = 700 → deviation = (418.27-700)/700 = -40% → outlier
    const result = computeR7(baseExtraction, [600, 800], testThresholds.r7MaxDeviation);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("R7");
  });
});

// --- Integration: computeCompliance ---

describe("computeCompliance", () => {
  it("returns verificationMinima and anomalies for a full extraction", () => {
    const data: DevisExtraction = {
      ...baseExtraction,
      grille_cnc: {
        ...baseGrilleCnc,
        "2_personnel": {
          postes: [
            makePersonnel({ poste: "Chef op", role_key: "cadreur_opv", tarif_journalier: 250 }),
            makePersonnel({ poste: "Ingé son", role_key: "chef_ops_ingenieur_du_son", tarif_journalier: 400 }),
          ],
          total: 6500,
        },
        "4_charges_sociales": { lignes: [], taux_moyen: 0.35, total: 1000 },
      },
    };

    const result = computeCompliance(data, testCcRates, testThresholds);

    // Verification
    expect(result.verificationMinima).toHaveLength(2);
    expect(result.verificationMinima[0].statut).toBe("non_conforme");
    expect(result.verificationMinima[1].statut).toBe("conforme");

    // R1 for non-conforme chef op
    expect(result.anomalies.some((a) => a.code === "R1")).toBe(true);
    // R6 for low charges rate
    expect(result.anomalies.some((a) => a.code === "R6")).toBe(true);
  });

  it("returns no anomalies for a clean extraction", () => {
    const data: DevisExtraction = {
      ...baseExtraction,
      grille_cnc: {
        ...baseGrilleCnc,
        "2_personnel": {
          postes: [makePersonnel({ tarif_journalier: 400 })],
          total: 4000,
        },
      },
    };

    const result = computeCompliance(data, testCcRates, testThresholds);
    const critical = result.anomalies.filter((a) => a.severite === "ÉLEVÉE");
    expect(critical).toHaveLength(0);
  });
});
