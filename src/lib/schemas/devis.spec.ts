import { describe, expect, it } from "vitest";

import { devisExtractionSchema, type DevisExtraction } from "./devis";

const validExtraction: DevisExtraction = {
  meta: {
    producteur: "Les Films du Rhin",
    titre: "Strasbourg, carrefour de l'Europe",
    duree_minutes: 52,
    diffuseur: "ARTE",
    lieu_tournage: "Strasbourg",
    type_production: "Documentaire 52min",
    format_source: "PDF structuré",
  },
  grille_cnc: {
    "1_droits_artistiques": {
      lignes: [
        { poste: "Droits d'auteur réalisateur", montant: 3000, sous_categorie: "auteurs" },
        { poste: "Musique originale", montant: 2000, sous_categorie: "musique" },
        { poste: "Archives INA", montant: 1500, sous_categorie: "archives" },
      ],
      total: 6500,
    },
    "2_personnel": {
      postes: [
        { poste: "Réalisateur", role_key: "realisateur", nombre_jours: 20, tarif_journalier: 350, total: 7000, confiance: "haute" },
        { poste: "Chef opérateur", role_key: "chef_operateur", nombre_jours: 10, tarif_journalier: 300, total: 3000, confiance: "moyenne" },
      ],
      total: 10000,
    },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": {
      lignes: [
        { poste: "Charges sur techniciens", montant: 3500 },
        { poste: "Charges sur réalisateur", montant: 2000 },
      ],
      taux_moyen: 0.55,
      total: 5500,
    },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": {
      lignes: [
        { poste: "Billets avion Paris-Strasbourg", montant: 1200 },
        { poste: "Location véhicule", montant: 1800 },
        { poste: "Hôtel équipe 10 nuits", montant: 1000 },
      ],
      total: 4000,
    },
    "7_tournage": {
      lignes: [
        { poste: "Location caméra Sony FX6", montant: 3000, sous_categorie: "camera" },
        { poste: "Kit HF Sennheiser", montant: 1000, sous_categorie: "son" },
        { poste: "Éclairage LED", montant: 500, sous_categorie: "lumiere" },
      ],
      total: 4500,
    },
    "8_post_production": {
      lignes: [
        { poste: "Salle de montage 3 semaines", montant: 3000, sous_categorie: "montage" },
        { poste: "Étalonnage DaVinci", montant: 1500, sous_categorie: "etalonnage" },
        { poste: "Mixage auditorium", montant: 2000, sous_categorie: "mixage" },
        { poste: "PAD et livraison", montant: 500 },
      ],
      total: 7000,
    },
    "9_assurance": {
      lignes: [{ poste: "Assurance production", montant: 1500 }],
      total: 1500,
    },
    "10_imprevus_fg_pd": {
      lignes: [
        { poste: "Imprévus 5%", montant: 2000 },
        { poste: "Frais généraux 8%", montant: 3000 },
        { poste: "Production déléguée", montant: 5000 },
      ],
      total: 10000,
    },
  },
  total_devis: 49000,
  cout_minute: 942.31,
  verification_minima: [
    { poste: "Chef opérateur", tarif_journalier: 300, minimum_cc: 281.54, ecart_pourcent: 6.56, statut: "conforme" },
    { poste: "Réalisateur", tarif_journalier: 15000, statut: "non_verifiable_forfait" },
    { poste: "Fixeur", tarif_journalier: 200, statut: "hors_nomenclature" },
  ],
  anomalies: [],
  postes_non_classes: [],
  confiance: "haute",
};

describe("devisExtractionSchema", () => {
  it("should validate a complete extraction with lignes", () => {
    const result = devisExtractionSchema.safeParse(validExtraction);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const invalid = { meta: { producteur: "Test" } };
    const result = devisExtractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should validate confiance enum values", () => {
    for (const value of ["haute", "moyenne", "basse"] as const) {
      const data = { ...validExtraction, confiance: value };
      const result = devisExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid confiance value", () => {
    const data = { ...validExtraction, confiance: "invalid" };
    const result = devisExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should validate anomaly codes R1, R3-R7", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      anomalies: [
        { code: "R1", severite: "ÉLEVÉE", params: { poste: "Chef opérateur", tarif: 250, minimum: 282 } },
        { code: "R5", severite: "ATTENTION", params: {} },
      ],
    };
    const result = devisExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept optional meta fields as undefined", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      meta: {
        ...validExtraction.meta,
        diffuseur: undefined,
        lieu_tournage: undefined,
        format_source: undefined,
      },
    };
    const result = devisExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should infer correct TypeScript types", () => {
    const extraction: DevisExtraction = validExtraction;
    const _producteur: string = extraction.meta.producteur;
    const _postes = extraction.grille_cnc["2_personnel"].postes;
    const _tarif: number = _postes[0].tarif_journalier;
    const _lignes = extraction.grille_cnc["1_droits_artistiques"].lignes;
    expect(_producteur).toBe("Les Films du Rhin");
    expect(_tarif).toBe(350);
    expect(_lignes).toHaveLength(3);
  });

  it("should accept per-line confiance on personnel", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      grille_cnc: {
        ...validExtraction.grille_cnc,
        "2_personnel": {
          postes: [
            { poste: "Monteur", role_key: "chef_monteur", nombre_jours: 5, tarif_journalier: 300, total: 1500, confiance: "basse" },
          ],
          total: 1500,
        },
      },
    };
    expect(devisExtractionSchema.safeParse(data).success).toBe(true);
  });

  it("should accept structured postes_non_classes", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      postes_non_classes: [
        { poste: "Drones spéciaux", montant: 2000, categorie_suggeree: "7_tournage", confiance: "moyenne" },
        { poste: "Frais divers", montant: 500 },
      ],
    };
    expect(devisExtractionSchema.safeParse(data).success).toBe(true);
  });

  it("should still accept string[] postes_non_classes for backward compat", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      postes_non_classes: ["Poste inconnu", "Autre poste"],
    };
    expect(devisExtractionSchema.safeParse(data).success).toBe(true);
  });

  it("should validate lignes with confiance and sous_categorie", () => {
    const data: DevisExtraction = {
      ...validExtraction,
      grille_cnc: {
        ...validExtraction.grille_cnc,
        "6_transport": {
          lignes: [
            { poste: "Taxi", montant: 200, confiance: "haute" },
            { poste: "Train", montant: 300, sous_categorie: "train", confiance: "moyenne" },
          ],
          total: 500,
        },
      },
    };
    expect(devisExtractionSchema.safeParse(data).success).toBe(true);
  });
});
