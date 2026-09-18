/**
 * Deterministic anomaly engine — rules R1, R3-R7.
 * Pure functions, no React, no async.
 */
import type {
  DevisExtraction,
  PersonnelLine,
  GrilleCnc,
  VerificationMinima,
  Anomalie,
} from "@/lib/schemas/devis";
import type { CcRates } from "@/lib/config/cc-minimums";
import type { StructuralThresholds } from "@/lib/config/structural-thresholds";
import type { ThresholdConfig } from "@/lib/db/queries-settings";

export interface ComplianceResult {
  verificationMinima: VerificationMinima[];
  anomalies: Anomalie[];
}

// --- CC compliance threshold (SPOT — single point of truth) ---

export function isNonConforme(rate: number, ccMinimum: number): boolean {
  return rate < ccMinimum;
}

// --- Verification minima ---

export function computeVerificationMinima(
  postes: PersonnelLine[],
  ccRates: CcRates,
): VerificationMinima[] {
  return postes.map((p) => {
    if (p.tarif_journalier === 0 || p.type_contrat === "forfait") {
      return {
        poste: p.poste,
        tarif_journalier: p.tarif_journalier,
        minimum_cc: null,
        ecart_pourcent: null,
        statut: "non_verifiable_forfait" as const,
      };
    }

    // Invoiced providers — CC minimums don't apply
    if (p.type_contrat === "prestataire") {
      return {
        poste: p.poste,
        tarif_journalier: p.tarif_journalier,
        minimum_cc: null,
        ecart_pourcent: null,
        statut: "non_verifiable_prestataire" as const,
      };
    }

    // Foreign companies — CC minimums don't apply
    if (p.type_contrat === "etranger") {
      return {
        poste: p.poste,
        tarif_journalier: p.tarif_journalier,
        minimum_cc: null,
        ecart_pourcent: null,
        statut: "non_verifiable_etranger" as const,
      };
    }

    const ccEntry = ccRates[p.role_key];
    if (!ccEntry) {
      return {
        poste: p.poste,
        tarif_journalier: p.tarif_journalier,
        minimum_cc: null,
        ecart_pourcent: null,
        statut: "hors_nomenclature" as const,
      };
    }

    const minimum = ccEntry.minimum;
    const ecart = Math.round(((p.tarif_journalier - minimum) / minimum) * 10000) / 100;

    const statut: VerificationMinima["statut"] = isNonConforme(p.tarif_journalier, minimum)
      ? "non_conforme"
      : "conforme";

    return {
      poste: p.poste,
      tarif_journalier: p.tarif_journalier,
      minimum_cc: minimum,
      ecart_pourcent: ecart,
      statut,
    };
  });
}

// --- R1: CC minimum violations ---

export function computeR1(verificationMinima: VerificationMinima[]): Anomalie[] {
  const anomalies: Anomalie[] = [];

  for (const v of verificationMinima) {
    if (v.statut === "non_conforme") {
      anomalies.push({
        code: "R1",
        severite: "ÉLEVÉE",
        params: { poste: v.poste, tarif: v.tarif_journalier, minimum: v.minimum_cc! },
        detailsParams: { ecart: v.ecart_pourcent! },
      });
    }
  }

  return anomalies;
}

// --- R3/R4: Structural anomalies ---

export function computeR3R4(
  grilleCnc: GrilleCnc,
  totalDevis: number,
  thresholds: StructuralThresholds,
): Anomalie[] {
  if (totalDevis <= 0) return [];

  const anomalies: Anomalie[] = [];

  for (const [key, threshold] of Object.entries(thresholds)) {
    const category = grilleCnc[key as keyof GrilleCnc];
    if (!category) continue;

    const categoryTotal = (category as { total: number }).total;
    if (categoryTotal <= 0) continue;

    const ratio = categoryTotal / totalDevis;

    if (ratio > threshold.high) {
      anomalies.push({
        code: "R3",
        severite: "ATTENTION",
        params: { label: threshold.label, ratio: (ratio * 100).toFixed(1), threshold: (threshold.high * 100).toFixed(0) },
        detailsParams: { amount: categoryTotal, total: totalDevis },
      });
    } else if (ratio < threshold.low) {
      anomalies.push({
        code: "R4",
        severite: "INFO",
        params: { label: threshold.label, ratio: (ratio * 100).toFixed(1), threshold: (threshold.low * 100).toFixed(0) },
        detailsParams: { amount: categoryTotal, total: totalDevis },
      });
    }
  }

  return anomalies;
}

// --- R5: Zero social charges ---

export function computeR5(chargesSociales: GrilleCnc["4_charges_sociales"]): Anomalie[] {
  if (chargesSociales.total === 0) {
    return [
      {
        code: "R5",
        severite: "ATTENTION",
        params: {},
        detailsParams: {},
      },
    ];
  }
  return [];
}

// --- R6: Low social charges rate ---

export function computeR6(chargesSociales: GrilleCnc["4_charges_sociales"], minRate: number): Anomalie[] {
  if (chargesSociales.taux_moyen != null && chargesSociales.taux_moyen < minRate) {
    return [
      {
        code: "R6",
        severite: "ATTENTION",
        params: { rate: (chargesSociales.taux_moyen * 100).toFixed(1) },
        detailsParams: {},
      },
    ];
  }
  return [];
}

// --- R7: Cost/minute outlier vs producer history ---

export function computeR7(data: DevisExtraction, producerHistory: number[] | undefined, maxDeviation: number): Anomalie[] {
  const history = producerHistory ?? [];
  if (history.length < 2) return [];

  const avg = history.reduce((sum, v) => sum + v, 0) / history.length;
  if (avg <= 0) return [];

  const deviation = (data.cout_minute - avg) / avg;

  if (Math.abs(deviation) > maxDeviation) {
    return [
      {
        code: "R7",
        severite: "ATTENTION",
        params: {
          direction: deviation > 0 ? "up" : "down",
          coutMinute: Math.round(data.cout_minute),
          avg: Math.round(avg),
          deviation: Math.round(deviation * 100),
        },
        detailsParams: { count: history.length },
      },
    ];
  }

  return [];
}

// --- Main entry point ---

export function computeCompliance(
  data: DevisExtraction,
  ccRates: CcRates,
  thresholds: ThresholdConfig,
  producerHistory?: number[],
): ComplianceResult {
  const verificationMinima = computeVerificationMinima(data.grille_cnc["2_personnel"].postes, ccRates);

  const anomalies: Anomalie[] = [
    ...computeR1(verificationMinima),
    ...computeR3R4(data.grille_cnc, data.total_devis, thresholds.structural),
    ...computeR5(data.grille_cnc["4_charges_sociales"]),
    ...computeR6(data.grille_cnc["4_charges_sociales"], thresholds.r6MinRate),
    ...computeR7(data, producerHistory, thresholds.r7MaxDeviation),
  ];

  return { verificationMinima, anomalies };
}
