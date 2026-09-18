// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useReviewForm } from "./use-review-form";
import { CC_FALLBACK_RATES } from "@/lib/config/cc-minimums";
import { DEFAULT_STRUCTURAL_THRESHOLDS, DEFAULT_R6_MIN_RATE, DEFAULT_R7_MAX_DEVIATION } from "@/lib/config/structural-thresholds";
import type { DevisExtraction } from "@/lib/schemas/devis";

const defaultThresholds = { structural: DEFAULT_STRUCTURAL_THRESHOLDS, r6MinRate: DEFAULT_R6_MIN_RATE, r7MaxDeviation: DEFAULT_R7_MAX_DEVIATION };

const baseExtraction: DevisExtraction = {
  meta: {
    producteur: "TestProd",
    titre: "Test Film",
    duree_minutes: 52,
    type_production: "Documentaire 52min",
  },
  grille_cnc: {
    "1_droits_artistiques": {
      lignes: [{ poste: "Auteur", montant: 5000 }],
      total: 5000,
    },
    "2_personnel": {
      postes: [
        { poste: "Réalisateur", role_key: "realisateur", nombre_jours: 10, tarif_journalier: 350, total: 3500 },
        { poste: "Chef op", role_key: "cadreur_opv", nombre_jours: 5, tarif_journalier: 300, total: 1500 },
      ],
      total: 5000,
    },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": { lignes: [{ poste: "Charges tech", montant: 2750 }], taux_moyen: 0.55, total: 2750 },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": { lignes: [{ poste: "Avion", montant: 2000 }], total: 2000 },
    "7_tournage": { lignes: [{ poste: "Caméra", montant: 1500 }], total: 1500 },
    "8_post_production": { lignes: [{ poste: "Salle montage", montant: 2000 }], total: 2000 },
    "9_assurance": { lignes: [{ poste: "Assurance", montant: 500 }], total: 500 },
    "10_imprevus_fg_pd": { lignes: [{ poste: "Imprévus 5%", montant: 3000 }], total: 3000 },
  },
  total_devis: 21750,
  cout_minute: 418.27,
  verification_minima: [],
  anomalies: [],
  postes_non_classes: [
    { poste: "Drone spécial", montant: 800, categorie_suggeree: "7_tournage" },
  ],
  confiance: "haute",
};

describe("useReviewForm", () => {
  it("initializes with correct totals", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    expect(result.current.totalDevis).toBe(21750);
    expect(result.current.isDirty).toBe(false);
  });

  it("updates meta and marks dirty", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.updateMeta({ titre: "New Title" }));
    expect(result.current.meta.titre).toBe("New Title");
    expect(result.current.isDirty).toBe(true);
  });

  it("updates a personnel line and recalculates totals", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.updatePersonnelLine(0, { tarif_journalier: 400 }));

    const postes = result.current.grilleCnc["2_personnel"].postes;
    expect(postes[0].total).toBe(4000); // 10 × 400
    expect(result.current.grilleCnc["2_personnel"].total).toBe(5500); // 4000 + 1500
  });

  it("classifies item as a visible line with 0 amount by default", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.classifyItem(0, "6_transport"));

    expect(result.current.postesNonClasses).toHaveLength(0);
    expect(result.current.classifiedItems["6_transport"]).toHaveLength(1);
    expect(result.current.classifiedItems["6_transport"][0].poste).toBe("Drone spécial");
    expect(result.current.classifiedItems["6_transport"][0].montant).toBe(0);
    // Grid total unchanged — classified amount starts at 0
    expect(result.current.totalDevis).toBe(21750);
  });

  it("updating classified line amount affects totalDevis", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.classifyItem(0, "7_tournage"));
    act(() => result.current.updateClassifiedLine("7_tournage", 0, 800));

    expect(result.current.classifiedItems["7_tournage"][0].montant).toBe(800);
    expect(result.current.totalDevis).toBe(21750 + 800);
  });

  it("removing classified line removes it from the list", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.classifyItem(0, "6_transport"));
    act(() => result.current.removeClassifiedLine("6_transport", 0));

    expect(result.current.classifiedItems["6_transport"]).toBeUndefined();
  });

  it("serializes back to DevisExtraction", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    const output = result.current.toDevisExtraction();
    expect(output.meta.producteur).toBe("TestProd");
    expect(output.total_devis).toBe(21750);
    expect(output.confiance).toBe("haute");
  });

  it("toDevisExtraction folds classifiedItems into grille_cnc", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    // Classify the "Drone spécial" into tournage and set its amount
    act(() => result.current.classifyItem(0, "7_tournage"));
    act(() => result.current.updateClassifiedLine("7_tournage", 0, 800));

    const output = result.current.toDevisExtraction();
    // The classified line should appear in tournage lignes
    const tournage = output.grille_cnc["7_tournage"];
    expect(tournage.lignes).toHaveLength(2); // original "Caméra" + classified "Drone spécial"
    expect(tournage.lignes[1].poste).toBe("Drone spécial");
    expect(tournage.lignes[1].montant).toBe(800);
    // Category total should include the classified amount
    expect(tournage.total).toBe(1500 + 800);
    // Total devis should match
    expect(output.total_devis).toBe(21750 + 800);
  });

  it("normalizes string[] postes_non_classes to structured format", () => {
    const withStrings: DevisExtraction = {
      ...baseExtraction,
      postes_non_classes: ["Poste A", "Poste B"],
    };
    const { result } = renderHook(() => useReviewForm(withStrings, CC_FALLBACK_RATES, defaultThresholds));
    expect(result.current.postesNonClasses).toEqual([
      { poste: "Poste A", montant: 0 },
      { poste: "Poste B", montant: 0 },
    ]);
  });

  it("recalculates cout_minute when duration changes", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    act(() => result.current.updateMeta({ duree_minutes: 26 }));
    // 21750 / 26 = 836.54
    expect(result.current.coutMinute).toBe(836.54);
  });

  it("toDevisExtraction runs the anomaly engine on current data", () => {
    const { result } = renderHook(() => useReviewForm(baseExtraction, CC_FALLBACK_RATES, defaultThresholds));
    // Lower chef_operateur rate below CC minimum (281.54)
    act(() => result.current.updatePersonnelLine(1, { tarif_journalier: 200 }));

    const output = result.current.toDevisExtraction();

    // Engine should compute verification_minima from current personnel data
    expect(output.verification_minima.length).toBeGreaterThan(0);
    const chefOp = output.verification_minima.find((v) => v.tarif_journalier === 200);
    expect(chefOp?.statut).toBe("non_conforme");

    // Should have an R1 anomaly
    expect(output.anomalies.some((a) => a.code === "R1")).toBe(true);
  });
});
