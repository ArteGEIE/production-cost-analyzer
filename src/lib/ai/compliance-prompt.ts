/**
 * Prompt for LLM qualitative compliance analysis (pass 3).
 * Takes the final extraction + deterministic engine results and asks the LLM
 * for contextual insights that rule-based checks cannot capture.
 */
import type { Anomalie, DevisExtraction } from "@/lib/schemas/devis";
import type { ComplianceResult } from "@/lib/anomalies/anomaly-engine";

/**
 * Fixed French phrasing for the LLM prompt (this prompt's output is not
 * locale-switched — see buildCompliancePrompt's "Réponds en français").
 * Mirrors the French copy in messages/fr.json's config.anomalies namespace.
 */
function formatAnomalyMessage(a: Anomalie): string {
  switch (a.code) {
    case "R1":
      return `Non-conformité CC : ${a.params.poste} à ${a.params.tarif} €/j (minimum ${a.params.minimum} €/j)`;
    case "R3":
      return `Structure atypique : ${a.params.label} représente ${a.params.ratio}% du total (seuil haut : ${a.params.threshold}%)`;
    case "R4":
      return `Structure atypique : ${a.params.label} ne représente que ${a.params.ratio}% du total (seuil bas : ${a.params.threshold}%)`;
    case "R5":
      return "Aucune charge sociale déclarée";
    case "R6":
      return `Taux de charges sociales bas : ${a.params.rate}% (seuil : 50%)`;
    case "R7":
      return `Coût/minute ${a.params.direction === "up" ? "supérieur" : "inférieur"} à la moyenne du producteur : ${a.params.coutMinute} €/min vs ${a.params.avg} €/min (écart ${a.params.deviation}%)`;
  }
}

export function buildCompliancePrompt(): string {
  return `Tu es un expert en analyse de coûts de production audiovisuelle, travaillant pour un diffuseur public. Tu reçois un devis déjà classifié sur la grille CNC à 10 catégories, accompagné des résultats d'une vérification automatique (règles R1, R3-R7).

## TA MISSION

Produire une **analyse qualitative complémentaire** que les règles automatiques ne peuvent pas détecter. Tu ne dois PAS répéter les anomalies déjà identifiées par le moteur (R1, R3-R7) — elles sont déjà affichées à l'utilisateur.

## CE QUE TU DOIS ANALYSER

1. **Cohérence croisée** — Les champs du devis sont-ils cohérents entre eux ?
   - Durée vs nombre de jours de tournage
   - Type de production vs structure de coûts (un reportage n'a pas le même profil qu'un documentaire 90min)
   - Lieu de tournage vs budget transport/défraiement
   - Nombre de techniciens vs moyens techniques

2. **Signaux contextuels** — Y a-t-il des éléments inhabituels ou notables ?
   - Postes budgétés à 0 € qui devraient normalement avoir un coût
   - Postes inhabituels pour ce type de production
   - Ratio personnel/moyens techniques atypique pour le genre

3. **Points positifs** — Le devis est-il globalement bien structuré ? Y a-t-il des points forts ?

4. **Synthèse** — Un paragraphe de conclusion avec ton appréciation globale.

## FORMAT DE SORTIE

Réponds en français avec des sections markdown :

### Cohérence du devis
[tes observations sur la cohérence croisée, ou "Aucune incohérence notable." si tout est cohérent]

### Points d'attention
[signaux contextuels qui méritent vérification, ou "Aucun signal particulier." si rien à signaler]

### Points positifs
[ce qui est bien fait dans ce devis]

### Synthèse
[un paragraphe de conclusion]

## RÈGLES

- Sois concis et actionnable — la responsable de production lit ce rapport rapidement
- Ne répète JAMAIS les anomalies R1, R3-R7 déjà détectées automatiquement
- Si le devis est globalement correct et cohérent, dis-le clairement — ne cherche pas des problèmes là où il n'y en a pas
- Utilise des montants et des pourcentages concrets quand tu fais une observation
- Pas de préambule, commence directement par la première section`;
}

/**
 * Build the user message containing the extraction data and engine results.
 */
export function buildComplianceUserMessage(
  extraction: DevisExtraction,
  compliance: ComplianceResult,
): string {
  return `Voici le devis classifié et les résultats de la vérification automatique :

## Métadonnées
${JSON.stringify(extraction.meta, null, 2)}

## Grille CNC (résumé des totaux)
${summarizeCncTotals(extraction)}

## Total devis : ${extraction.total_devis} €
## Coût/minute : ${extraction.cout_minute} €/min

## Résultats de la vérification automatique (R1, R3-R7)
${compliance.anomalies.length === 0 ? "Aucune non-conformité détectée." : compliance.anomalies.map((a) => `- [${a.code}/${a.severite}] ${formatAnomalyMessage(a)}`).join("\n")}

## Vérification des minima CC
${compliance.verificationMinima.map((v) => `- ${v.poste}: ${v.tarif_journalier} €/j → ${v.statut}${v.minimum_cc ? ` (min CC: ${v.minimum_cc} €)` : ""}`).join("\n")}

## Personnel détaillé
${JSON.stringify(extraction.grille_cnc["2_personnel"].postes, null, 2)}

Analyse ce devis et fournis tes observations qualitatives.`;
}

function summarizeCncTotals(extraction: DevisExtraction): string {
  const g = extraction.grille_cnc;
  const total = extraction.total_devis;
  const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "—";

  return [
    `1. Droits artistiques: ${g["1_droits_artistiques"].total} € (${pct(g["1_droits_artistiques"].total)})`,
    `2. Personnel: ${g["2_personnel"].total} € (${pct(g["2_personnel"].total)})`,
    `3. Interprétation: ${g["3_interpretation"].total} € (${pct(g["3_interpretation"].total)})`,
    `4. Charges sociales: ${g["4_charges_sociales"].total} € (${pct(g["4_charges_sociales"].total)})`,
    `5. Décors/costumes: ${g["5_decors_costumes"].total} € (${pct(g["5_decors_costumes"].total)})`,
    `6. Transport: ${g["6_transport"].total} € (${pct(g["6_transport"].total)})`,
    `7. Moyens techniques: ${g["7_tournage"].total} € (${pct(g["7_tournage"].total)})`,
    `8. Post-production: ${g["8_post_production"].total} € (${pct(g["8_post_production"].total)})`,
    `9. Assurance: ${g["9_assurance"].total} € (${pct(g["9_assurance"].total)})`,
    `10. Imprévus/FG/PD: ${g["10_imprevus_fg_pd"].total} € (${pct(g["10_imprevus_fg_pd"].total)})`,
  ].join("\n");
}
