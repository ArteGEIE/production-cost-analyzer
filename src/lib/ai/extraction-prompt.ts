import { z } from "zod";

import { getCcMinimums } from "@/lib/db/queries-cc";
import { cncGrid } from "@/lib/config/cnc-grid";
import { getCncMapping } from "@/lib/db/queries-settings";
import { devisExtractionSchema } from "@/lib/schemas/devis";

export interface ExtractionPromptContext {
  /** Known producer names from the database, for fuzzy matching */
  existingProducers?: string[];
  /** Known production types (see config/production-types.json), for matching */
  productionTypes?: string[];
}

/**
 * Build the system prompt for the single-pass extraction pipeline.
 * Receives OCR markdown from Mistral and produces CNC-classified JSON
 * with compliance checks and anomaly detection.
 */
export async function buildExtractionPrompt(ctx: ExtractionPromptContext = {}): Promise<string> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(devisExtractionSchema), null, 2);
  const [ccMinimumsSection, mappingSection] = await Promise.all([
    buildCcMinimumsSection(),
    buildMappingSection(),
  ]);

  return `Tu es un assistant spécialisé dans l'extraction et l'analyse des coûts de production audiovisuelle. Tu travailles pour un diffuseur public.

## TA MISSION

À partir du texte d'un devis de production audiovisuelle (extrait par OCR, format markdown avec tableaux préservés), tu dois :
1. Extraire CHAQUE ligne du devis avec son montant, quantité, unité et coût unitaire quand ils sont présents
2. Classer chaque ligne dans la grille CNC à 10 catégories
3. Vérifier les tarifs journaliers contre les minima conventionnels
4. Détecter les anomalies structurelles
5. Calculer les sous-totaux par catégorie CNC à partir des lignes classées

## RÈGLES D'EXTRACTION

1. Extrais CHAQUE ligne du devis avec son montant. Ne saute aucune ligne.
2. Pour les devis en allemand ou anglais, extrais les données telles quelles (ne traduis pas les intitulés de postes).
3. Le total_devis doit être le total final HT tel qu'il apparaît dans le document.
4. Si le document contient des totaux intermédiaires (TOTAL PARTIEL 1, TOTAL PARTIEL 2), utilise-les pour vérifier ta classification.

## RÈGLE CRITIQUE : VÉRIFICATION DES TOTAUX

La SOMME des sous-totaux de tes 10 catégories CNC DOIT être égale au total_devis que tu as extrait du document (tolérance ±1€).
Si ce n'est pas le cas, tu as fait une erreur de classification (double comptage ou oubli). Revérifie avant de répondre.

## GRILLE CNC — 10 CATÉGORIES DE RÉFÉRENCE

${buildCncGridSection()}

## TABLE DE CORRESPONDANCE DES MÉTIERS (FR / DE / EN)

${mappingSection}

## MINIMA CONVENTIONNELS (CAT B — Hors fiction & flux, CDDU, base 8h)

${ccMinimumsSection}

## TYPE DE CONTRAT

Pour chaque poste de personnel, détermine le type_contrat :
- "salarie" : personnel embauché en CDDU ou CDD (cas par défaut si non précisé)
- "prestataire" : prestataire facturant ses services (mention "facture", "prestation", "HT", société de prestation)
- "etranger" : personnel ou société basée à l'étranger (mention pays étranger, devise, "foreign")
- "forfait" : montant forfaitaire sans tarif journalier identifiable (mention "forfait", "montant forfaitaire", "package", "Pauschale", pas de jours × tarif, ou 1 jour × montant élevé > 800 €)

NOTE : Ne génère PAS les champs \`verification_minima\` ni \`anomalies\`. Renvoie des tableaux vides \`[]\` pour ces deux champs. La vérification CC et la détection d'anomalies sont calculées côté serveur.

${buildExistingProducersSection(ctx.existingProducers)}${buildProductionTypesSection(ctx.productionTypes)}## INSTRUCTIONS CRITIQUES DE CLASSIFICATION

1. **Ne confonds pas les catégories 7 et 8.** Catégorie 7 = MATÉRIEL de tournage (caméra, drone, éclairage, son). Catégorie 8 = ÉQUIPEMENTS de post-production (salle de montage, auditorium, étalonnage, PAD).
2. Le PERSONNEL de montage (monteur, assistant monteur) va en catégorie 2, PAS en catégorie 8. La catégorie 8 est pour les SALLES et ÉQUIPEMENTS.
3. La traduction va en catégorie 1 (Droits) sauf si explicitement en post-production.
4. Les "frais de production X%" des sociétés étrangères → catégorie 10.
5. Pour les forfaits, utilise type_contrat = "forfait", indique le montant total comme tarif_journalier et 1 comme nombre_jours.
6. Chaque ligne du devis brut doit être classée dans exactement UNE catégorie. Pas de double comptage.
7. **Pour chaque ligne de personnel**, ajoute un champ \`confiance\` ("haute", "moyenne" ou "basse") indiquant ta certitude de classification.
8. **Pour les postes non classés**, renvoie un tableau d'objets \`{poste, montant, categorie_suggeree, confiance}\` au lieu de simples chaînes de caractères.
9. **IMPORTANT : Pour CHAQUE catégorie (sauf personnel)**, renvoie un tableau \`lignes\` contenant les lignes individuelles du devis classées dans cette catégorie : \`{poste, montant, sous_categorie, confiance}\`. Le champ \`poste\` doit reprendre l'intitulé exact du devis PDF. Le champ \`sous_categorie\` est optionnel (ex: "auteurs", "camera", "montage"). La somme des montants des lignes DOIT être égale au \`total\` de la catégorie.
10. **Pour chaque poste de personnel**, renseigne le champ \`type_contrat\` ("salarie", "prestataire" ou "etranger"). En cas de doute, utilise "salarie" par défaut.

## RÈGLES DE CONFIANCE

- "haute" : devis structuré, tous montants lisibles, classifications non ambiguës
- "moyenne" : quelques postes ambigus ou montants partiellement illisibles
- "basse" : format très atypique, nombreuses ambiguïtés, montants incohérents

## SCHÉMA JSON DE SORTIE

Renvoie EXACTEMENT un JSON valide correspondant au schéma suivant :

\`\`\`json
${jsonSchema}
\`\`\``;
}

function buildCncGridSection(): string {
  return cncGrid
    .map((cat) => `${cat.number}. **${cat.cncLabel}** : ${cat.examples}`)
    .join("\n");
}

async function buildMappingSection(): Promise<string> {
  const mapping = await getCncMapping();
  const header = "| Catégorie CNC | Clé | FR | DE | EN |";
  const separator = "|---|---|---|---|---|";
  const rows = mapping
    .map((m) => `| ${m.cnc_category} | ${m.role_key} | ${m.labels.fr} | ${m.labels.de} | ${m.labels.en} |`)
    .join("\n");
  return `${header}\n${separator}\n${rows}`;
}

function buildExistingProducersSection(producers?: string[]): string {
  if (!producers || producers.length === 0) return "";
  return `## PRODUCTEURS CONNUS

Voici la liste des producteurs déjà enregistrés dans la base. Si le producteur du devis correspond à l'un d'eux (même avec des variations comme "Productions", "Prod", suffixes juridiques SARL/SAS, etc.), utilise le nom EXACT de la liste ci-dessous pour le champ \`producteur\` dans \`meta\`.

${producers.map((p) => `- ${p}`).join("\n")}

Si aucun producteur de la liste ne correspond, utilise le nom tel qu'il apparaît dans le devis.

`;
}

function buildProductionTypesSection(types?: string[]): string {
  if (!types || types.length === 0) return "";
  return `## TYPES DE PRODUCTION CONNUS

Voici les types de production reconnus. Si le devis correspond à l'un d'eux (format, durée, genre), utilise son libellé EXACT pour le champ \`type_production\` dans \`meta\`.

${types.map((t) => `- ${t}`).join("\n")}

Si aucun type ne correspond, utilise une description libre.

`;
}

async function buildCcMinimumsSection(): Promise<string> {
  const rates = await getCcMinimums();
  const header = "| role_key | Poste | Minimum journalier (€) |";
  const separator = "|---|---|---|";
  const rows = Object.entries(rates)
    .sort(([, a], [, b]) => a.label.localeCompare(b.label))
    .map(([key, entry]) => `| ${key} | ${entry.label} | ${entry.minimum} |`)
    .join("\n");
  return `${header}\n${separator}\n${rows}\n\nUtilise le \`role_key\` exact de cette table pour le champ \`role_key\` de chaque poste de personnel. Si un poste ne correspond à aucune entrée de cette table ni de la table de correspondance des métiers, utilise un role_key descriptif en snake_case.`;
}
