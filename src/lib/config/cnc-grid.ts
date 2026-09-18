/**
 * CNC 10-category grid. cncLabel is the official CNC term, used in the LLM
 * prompt; the organization-facing label lives in the message catalogs
 * (config.cncGridOrg.<key>) since it's locale-dependent.
 * Contains explicit item examples to help LLM classification.
 */
export interface CncCategory {
  key: string;
  number: number;
  cncLabel: string;
  /** Explicit examples of what belongs in this category — used in the LLM prompt */
  examples: string;
}

export const cncGrid: readonly CncCategory[] = [
  { key: "1_droits_artistiques", number: 1, cncLabel: "Droits artistiques", examples: "droits d'auteur, co-auteur, auteur-réalisateur, musique, archives, traduction, voix off" },
  { key: "2_personnel", number: 2, cncLabel: "Personnel", examples: "producteur, dir. production, chargé de prod, assistant prod, réalisateur, co-réalisateur, journaliste-réalisateur, rédacteur en chef, stringer/fixeur, JRI, cadreur, chef opérateur, monteur, assistant monteur, technicien vidéo, ingénieur du son, étalonneur, doublage/speaker" },
  { key: "3_interpretation", number: 3, cncLabel: "Interprétation", examples: "voix commentaire, comédiens" },
  { key: "4_charges_sociales", number: 4, cncLabel: "Charges sociales", examples: "charges sur auteurs/AGESSA, sur réalisateur, sur techniciens, sur personnel/équipe, intermittents/congés spectacle" },
  { key: "5_decors_costumes", number: 5, cncLabel: "Décors et costumes", examples: "location studio, accessoires" },
  { key: "6_transport", number: 6, cncLabel: "Transport, défraiement, régie", examples: "avion/train, véhicule/essence, hôtels, repas, frais divers, régie" },
  { key: "7_tournage", number: 7, cncLabel: "Moyens techniques de tournage", examples: "caméra/unité de tournage, matériel son/HF, éclairage, drone, disques durs tournage, consommables tournage" },
  { key: "8_post_production", number: 8, cncLabel: "Post-production", examples: "salle de montage/banc de montage, salle de mixage/auditorium, étalonnage (salle), PAD/master/livraison fichier, disques durs montage, numérisation/dérushage" },
  { key: "9_assurance", number: 9, cncLabel: "Assurance", examples: "assurance production" },
  { key: "10_imprevus_fg_pd", number: 10, cncLabel: "Imprévus, frais généraux, production déléguée", examples: "imprévus (%), frais généraux (%), frais financiers (%), production déléguée" },
] as const satisfies readonly CncCategory[];
