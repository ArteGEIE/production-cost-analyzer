import { z } from "zod";

// --- Shared confidence enum ---
export const confianceLineSchema = z.enum(["haute", "moyenne", "basse", "inconnue"]);
export type ConfianceLine = z.infer<typeof confianceLineSchema>;

// --- Line item schema — used in every CNC category ---

const ligneSchema = z.object({
  poste: z.string().describe("Line item name as written in the budget PDF"),
  montant: z.number().describe("Amount in euros"),
  sous_categorie: z.string().nullish().describe("Sub-category key (e.g. auteurs, camera, montage)"),
  confiance: confianceLineSchema.nullish().describe("Classification confidence for this line"),
});

// --- Personnel has richer line items ---

const personnelLineSchema = z.object({
  poste: z.string().describe("Job title as written in the budget"),
  role_key: z.string().describe("Normalized role key (e.g. chef_operateur, ingenieur_son)"),
  nombre_jours: z.number().describe("Number of days"),
  tarif_journalier: z.number().describe("Daily rate in euros"),
  total: z.number().describe("Line total in euros"),
  confiance: confianceLineSchema.nullish().describe("Per-line extraction confidence"),
  type_contrat: z.enum(["salarie", "prestataire", "etranger", "forfait"]).nullish()
    .describe("Contract type: salarie (employee/CDDU), prestataire (invoiced provider), etranger (foreign company), forfait (lump sum — not a daily rate). Null defaults to salarie."),
});

export const posteNonClasseSchema = z.object({
  poste: z.string().describe("Budget line item name"),
  montant: z.number().describe("Amount in euros"),
  categorie_suggeree: z.string().nullish().describe("Suggested CNC category key"),
  confiance: confianceLineSchema.nullish().describe("Classification confidence"),
});

// --- CNC category schemas — all now carry lignes[] ---

const droitsArtistiquesSchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  total: z.number().describe("Subtotal for category 1"),
});

const personnelSchema = z.object({
  postes: z.array(personnelLineSchema).describe("Itemized personnel lines"),
  total: z.number().describe("Subtotal for category 2"),
});

const chargesSocialesSchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  taux_moyen: z.number().nullish().describe("Average social charges rate as decimal (e.g. 0.55)"),
  total: z.number().describe("Subtotal for category 4"),
});

const simpleCategorySchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  total: z.number().describe("Category subtotal"),
});

const tournageSchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  total: z.number().describe("Subtotal for category 7"),
});

const postProductionSchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  total: z.number().describe("Subtotal for category 8"),
});

const imprevusSchema = z.object({
  lignes: z.array(ligneSchema).describe("Individual budget lines classified in this category"),
  total: z.number().describe("Subtotal for category 10"),
});

// --- CNC grid schema ---

const grilleCncSchema = z.object({
  "1_droits_artistiques": droitsArtistiquesSchema.describe("Category 1: Artistic rights"),
  "2_personnel": personnelSchema.describe("Category 2: Personnel expenses"),
  "3_interpretation": simpleCategorySchema.describe("Category 3: Interpretation / performers"),
  "4_charges_sociales": chargesSocialesSchema.describe("Category 4: Social charges"),
  "5_decors_costumes": simpleCategorySchema.describe("Category 5: Sets and costumes"),
  "6_transport": simpleCategorySchema.describe("Category 6: Transport, per diem, logistics"),
  "7_tournage": tournageSchema.describe("Category 7: Shooting technical means"),
  "8_post_production": postProductionSchema.describe("Category 8: Post-production"),
  "9_assurance": simpleCategorySchema.describe("Category 9: Insurance"),
  "10_imprevus_fg_pd": imprevusSchema.describe("Category 10: Contingency, overhead, exec production"),
});

// --- Verification & anomalies ---

const verificationMinimaSchema = z.object({
  poste: z.string().describe("Job title"),
  tarif_journalier: z.number().describe("Daily rate found in budget (or forfait amount)"),
  minimum_cc: z.number().nullish().describe("CC minimum daily rate (if applicable)"),
  ecart_pourcent: z.number().nullish().describe("Deviation percentage from CC minimum"),
  statut: z.enum([
    "conforme",
    "non_conforme",
    "non_verifiable_forfait",
    "non_verifiable_prestataire",
    "non_verifiable_etranger",
    "hors_nomenclature",
  ]).describe("Compliance status"),
});

const anomalieSchema = z.object({
  code: z.enum(["R1", "R3", "R4", "R5", "R6", "R7"]).describe("Anomaly rule code"),
  severite: z.enum(["ÉLEVÉE", "ATTENTION", "INFO"]).describe("Severity level"),
  params: z.record(z.string(), z.union([z.string(), z.number()])).describe("Values to interpolate into the localized rule message"),
  detailsParams: z.record(z.string(), z.union([z.string(), z.number()])).nullish().describe("Values to interpolate into the localized rule details"),
});

// --- Meta schema ---

const metaSchema = z.object({
  producteur: z.string().describe("Production company name"),
  titre: z.string().describe("Production title"),
  duree_minutes: z.number().describe("Duration in minutes"),
  diffuseur: z.string().nullish().describe("Broadcaster name"),
  lieu_tournage: z.string().nullish().describe("Shooting location"),
  type_production: z.string().describe("Production type (documentaire, reportage, magazine, etc.)"),
  date_devis: z.string().nullish().describe("Budget date as found on the document (ISO format YYYY-MM-DD, or YYYY-MM, or YYYY). Extract the most precise date visible on the PDF."),
  format_source: z.string().nullish().describe("Original format of the budget PDF"),
  cnc_funding: z.boolean().nullish().describe("Whether the production benefits from CNC funding"),
});

// --- Main extraction schema (UC3-CNC-Devis-v1) ---

export const devisExtractionSchema = z.object({
  meta: metaSchema.describe("Production metadata extracted from the budget PDF"),
  grille_cnc: grilleCncSchema.describe("10-category CNC grid with extracted amounts"),
  total_devis: z.number().describe("Total budget amount in euros — must match PDF total within 1€"),
  cout_minute: z.number().describe("Cost per minute (total_devis / duree_minutes)"),
  verification_minima: z.array(verificationMinimaSchema).describe("CC minimum rate verification for each personnel line"),
  anomalies: z.array(anomalieSchema).describe("Detected anomalies (rules R1, R3-R7)"),
  postes_non_classes: z.union([
    z.array(posteNonClasseSchema),
    z.array(z.string()),
  ]).describe("Budget line items that could not be classified into the CNC grid"),
  confiance: z.enum(["haute", "moyenne", "basse"]).describe("Overall extraction confidence level"),
});

export type DevisExtraction = z.infer<typeof devisExtractionSchema>;
export type Ligne = z.infer<typeof ligneSchema>;
export type PersonnelLine = z.infer<typeof personnelLineSchema>;
export type PosteNonClasse = z.infer<typeof posteNonClasseSchema>;
export type VerificationMinima = z.infer<typeof verificationMinimaSchema>;
export type Anomalie = z.infer<typeof anomalieSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type GrilleCnc = z.infer<typeof grilleCncSchema>;
export type SimpleCategory = z.infer<typeof simpleCategorySchema>;
