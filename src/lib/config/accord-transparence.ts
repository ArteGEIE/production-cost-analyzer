/**
 * Accord de transparence — standard indirect cost rates (section 4.3).
 * Defines expected frais généraux, frais financiers, imprévus, and
 * rémunération du producteur délégué by production type.
 */

export interface AccordTransparenceRates {
  label: string;
  fraisGeneraux: number;
  fraisFinanciers: number;
  imprevus: number;
  productionDeleguee: string;
}

export const ACCORD_TRANSPARENCE: Record<string, AccordTransparenceRates> = {
  fiction_70pct: {
    label: "Fiction financée à plus de 70%",
    fraisGeneraux: 0.10,
    fraisFinanciers: 0.015,
    imprevus: 0.07,
    productionDeleguee: "70k€/90', 35k€/52', 17,5k€/26' (historiques) — sinon gré à gré",
  },
  fiction_autre: {
    label: "Fiction (hors coproductions internationales)",
    fraisGeneraux: 0.10,
    fraisFinanciers: 0.02,
    imprevus: 0.07,
    productionDeleguee: "Gré à gré",
  },
  animation: {
    label: "Animation",
    fraisGeneraux: 0.10,
    fraisFinanciers: 0.025,
    imprevus: 0.07,
    productionDeleguee: "225k€ pour 26×24' ou 52×13' ou 78×7' (prorata temporis autres formats)",
  },
  documentaire: {
    label: "Documentaire",
    fraisGeneraux: 0.15,
    fraisFinanciers: 0.02,
    imprevus: 0.07,
    productionDeleguee: "30k€/90', 20k€/52' (historiques) — sinon gré à gré",
  },
  adaptation_spectacle: {
    label: "Adaptation audiovisuelle de spectacle vivant",
    fraisGeneraux: 0.15,
    fraisFinanciers: 0.02,
    imprevus: 0.07,
    productionDeleguee: "Gré à gré",
  },
};

export const DEFAULT_ACCORD_TYPE = "documentaire";
