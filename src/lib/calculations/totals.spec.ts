import { describe, expect, it } from "vitest";

import {
  calculateCategoryTotal,
  calculateTotalDevis,
  calculateCoutMinute,
  recalculatePersonnelLineTotal,
} from "./totals";
import type { GrilleCnc } from "@/lib/schemas/devis";

const sampleGrille: GrilleCnc = {
  "1_droits_artistiques": { lignes: [{ poste: "Auteur", montant: 5000 }], total: 5000 },
  "2_personnel": {
    postes: [
      { poste: "Réalisateur", role_key: "realisateur", nombre_jours: 10, tarif_journalier: 350, total: 3500 },
    ],
    total: 3500,
  },
  "3_interpretation": { lignes: [], total: 0 },
  "4_charges_sociales": { lignes: [{ poste: "Charges tech", montant: 1925 }], taux_moyen: 0.55, total: 1925 },
  "5_decors_costumes": { lignes: [], total: 0 },
  "6_transport": { lignes: [{ poste: "Avion", montant: 2000 }], total: 2000 },
  "7_tournage": { lignes: [{ poste: "Caméra", montant: 1500 }], total: 1500 },
  "8_post_production": { lignes: [{ poste: "Montage", montant: 2000 }], total: 2000 },
  "9_assurance": { lignes: [{ poste: "Assurance", montant: 800 }], total: 800 },
  "10_imprevus_fg_pd": { lignes: [{ poste: "Imprévus", montant: 3500 }], total: 3500 },
};

describe("calculateCategoryTotal", () => {
  it("returns .total for category objects", () => {
    expect(calculateCategoryTotal({ total: 6500 })).toBe(6500);
  });

  it("returns 0 for undefined", () => {
    expect(calculateCategoryTotal(undefined)).toBe(0);
  });
});

describe("calculateTotalDevis", () => {
  it("sums all 10 category totals", () => {
    // 5000 + 3500 + 0 + 1925 + 0 + 2000 + 1500 + 2000 + 800 + 3500 = 20225
    expect(calculateTotalDevis(sampleGrille)).toBe(20225);
  });
});

describe("calculateCoutMinute", () => {
  it("divides total by duration", () => {
    expect(calculateCoutMinute(49000, 52)).toBe(942.31);
  });

  it("returns 0 for zero duration", () => {
    expect(calculateCoutMinute(49000, 0)).toBe(0);
  });
});

describe("recalculatePersonnelLineTotal", () => {
  it("multiplies days by daily rate", () => {
    expect(recalculatePersonnelLineTotal({ nombre_jours: 10, tarif_journalier: 300 })).toBe(3000);
  });

  it("handles fractional days", () => {
    expect(recalculatePersonnelLineTotal({ nombre_jours: 2.5, tarif_journalier: 200 })).toBe(500);
  });
});
