/**
 * Pure parser: reads a history spreadsheet (one sheet per production, CNC-style
 * budget rows — see ROW_LABELS below for the labels it looks for) and returns
 * ParsedProduction[]. No DB writes, no side effects beyond reading the file.
 *
 * Consumed by:
 *   - scripts/seed-history.ts (writes an organisation's real data to its DB)
 *   - scripts/anonymize-history-to-demo.ts (produces demo-data/history.json)
 */

import * as XLSX from "xlsx";
import { mapXlsxLabelToRoleKey } from "../src/lib/analytics/seed-job-mapping";
import { CC_FALLBACK_RATES } from "../src/lib/config/cc-minimums";


// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Production type assigned to every imported row (the spreadsheet has no
// per-production type column). Override with HISTORY_XLSM_PRODUCTION_TYPE.
const DEFAULT_TYPE_PRODUCTION = process.env.HISTORY_XLSM_PRODUCTION_TYPE ?? "Reportage";

// Row labels we search for (col 0 or col 1) to locate key rows dynamically.
// Using startsWith / includes to be resilient to minor formatting differences.
const ROW_LABELS: Record<string, (label: string) => boolean> = {
  // Droits artistiques — subtotal
  droitsArtistiques: (l) => l.startsWith("SOUS-TOTAL ENSEMBLE DES DROITS ARTISTIQUES"),
  // Droits artistiques — individual rows
  dtsAuteur: (l) => l === "DTS D'AUTEUR",
  dtsCOAuteur: (l) => l === "DTS CO-AUTEUR",
  auteurReal: (l) => l === "AUTEUR-REAL",
  sujetOeuvre: (l) => l.startsWith("SUJET") || l.startsWith("ŒUVRE"),
  archives: (l) => l === "ARCHIVES",
  musique: (l) => l === "MUSIQUE",
  voixOff: (l) => l === "VOIX OFF",
  traduction: (l) => l === "TRADUCTION",

  // Personnel — individual rows
  producteur: (l) => l === "PRODUCTEUR",
  administrateur: (l) => l === "ADMINISTRATEUR",
  dirProd: (l) => l === "DIR. PROD",
  chargeProd: (l) => l === "CHARGE DE PROD",
  responsablePostProd: (l) => l === "RESPONSABLE POST PROD",
  assistantProd: (l) => l === "ASSISTANT PROD",
  realisateur: (l) => l === "REALISATEUR",
  coReal: (l) => l === "CO REAL",
  journalisteReal: (l) => l === "JOURNALISTE-REAL",
  assistantReal: (l) => l === "ASSITANT REAL",
  redacteurChef: (l) => l === "REDACTEUR EN CHEF",
  stringerFixeur: (l) => l === "STRINGER/FIXEUR",
  jri: (l) => l === "JRI",
  auteur: (l) => l === "AUTEUR",
  cadreur: (l) => l === "CADREUR",
  chefOp: (l) => l === "CHEF OP",
  monteurTruquiste: (l) => l.startsWith("MONTEUR / MONTEUR TRUQUISTE") || l === "MONTEUR / MONTEUR TRUQUISTE",
  technicienVideo: (l) => l === "TECHNICIEN VIDEO",
  assistantPostprod: (l) => l === "ASSITANT POSTPROD",
  ingeSon: (l) => l === "INGE SON",
  etalonneur: (l) => l === "ETALONNEUR",
  doublageSpeaker: (l) => l === "DOUBLAGE/SPEAKER",
  equipeTournage: (l) => l === "EQUIPE TOURNAGE",
  equipeMontage: (l) => l === "EQUIPE MONTAGE",

  // Personnel — subtotals
  personnelSubtotal: (l) => l === "SOUS TOTAL" || l === "SOUS-TOTAL", // first occurrence in personnel block
  chargesSociales: (l) => l === "SOUS-TOTAL" || l === "SOUS TOTAL", // in charges block
  honoraires: (l) => l.startsWith("HONORAIRES"),
  personnelEnsemble: (l) => l.includes("ENSEMBLE DES COUTS DU PERSONNEL"),

  // Charges sociales — individual rows
  agessa: (l) => l.includes("AGESSA") || l.includes("ARTISTES"),
  csTechniciens: (l) => l === "TECHNICIENS",
  csIntermittents: (l) => l.includes("INTERMITTENTS"),
  csRealisateur: (l) => l === "REALISATEUR",
  csProducteur: (l) => l === "PRODUCTEUR",
  csPersonnel: (l) => l.startsWith("PERSONNEL") || l.startsWith("EQUIPE"),
  csComediens: (l) => l === "COMEDIENS",

  // Moyens techniques
  camera: (l) => l.includes("CAMERA"),
  hfSon: (l) => l.startsWith("HF/SON"),
  montage: (l) => l === "MONTAGE",
  mixage: (l) => l === "MIXAGE",
  etalonnage: (l) => l.startsWith("ETALONNAGE"),
  autre: (l) => l === "AUTRE",
  drone: (l) => l.includes("DRONE"),
  pad: (l) => l.includes("PAD"),

  // Other costs
  prodDeleguee: (l) => l.includes("PRODUCTION DELEGUEE") || l.includes("PRODUCTION DÉLÉGUÉE"),
  assurances: (l) => l.startsWith("ASSURANCES"),
  fraisGeneraux: (l) => l.startsWith("FRAIS GENERAUX") || l.startsWith("FRAIS GÉNÉRAUX"),
  fraisFinanciers: (l) => l.startsWith("FRAIS FINANCIERS"),
  divers: (l) => l === "DIVERS",
  imprevus: (l) => l.startsWith("IMPREVUS") || l.startsWith("IMPRÉVUS"),

  // Totals
  transports: (l) => l === "TRANSPORTS",
  totalAvecTransports: (l) => l.includes("COUT TOTAL GLOBAL") && l.includes("TRANSPORT"),
  totalSansTransports: (l) => l.startsWith("COUT TOTAL GLOBAL") && !l.includes("TRANSPORT"),
  coutMinute: (l) => l.toLowerCase().startsWith("coût par minute") || l.toLowerCase().startsWith("cout par minute"),
};

// Keys for personnel individual rows (to build postes array)
const PERSONNEL_ROW_KEYS = [
  "producteur", "administrateur", "dirProd", "chargeProd",
  "responsablePostProd", "assistantProd", "realisateur", "coReal",
  "journalisteReal", "assistantReal", "redacteurChef", "stringerFixeur",
  "jri", "cadreur", "chefOp", "monteurTruquiste",
  "technicienVideo", "assistantPostprod", "ingeSon", "etalonneur",
  "doublageSpeaker", "equipeTournage", "equipeMontage",
];

// Keys for droits artistiques individual rows
const DROITS_ROW_KEYS = [
  "dtsAuteur", "dtsCOAuteur", "auteurReal", "sujetOeuvre",
  "archives", "musique", "voixOff", "traduction",
];

// Keys for charges sociales individual rows
const CHARGES_ROW_KEYS = [
  "agessa", "csRealisateur", "csProducteur", "csTechniciens",
  "csPersonnel", "csComediens", "csIntermittents",
];

// Keys for moyens techniques
const MOYENS_TECHNIQUES_KEYS = ["camera", "hfSon", "autre", "drone"];

// Keys for post-production
const POST_PROD_KEYS = ["montage", "mixage", "etalonnage", "pad"];

// Keys for imprévus / frais généraux / production déléguée
const IMPREVUS_FG_PD_KEYS = [
  "prodDeleguee", "fraisGeneraux", "fraisFinanciers", "divers", "imprevus",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert camelCase to snake_case for sous_categorie keys */
function toSnakeCase(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

type Row = (string | number | null)[];
type SheetData = Row[];

function findRowIndices(data: SheetData): Record<string, number> {
  const result: Record<string, number> = {};

  // Build a flat lookup: find rows by label matching
  // We need to handle that some labels repeat (e.g. "SOUS TOTAL" appears multiple times).
  // Strategy: scan in order and use context.

  // Track which section we are in to disambiguate repeated labels
  let inChargesSociales = false;

  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];
    const col0 = String(row[0] || "").trim();
    const col1 = String(row[1] || "").trim();
    const label = col0 || col1;
    if (!label) continue;

    // droitsArtistiques subtotal
    if (!result.droitsArtistiques && ROW_LABELS.droitsArtistiques(col0)) {
      result.droitsArtistiques = r;
    }

    // Droits artistiques individual rows (in col1)
    for (const key of DROITS_ROW_KEYS) {
      if (result[key] == null && ROW_LABELS[key](col1)) {
        result[key] = r;
      }
    }

    // personnelEnsemble (unique label)
    if (!result.personnelEnsemble && ROW_LABELS.personnelEnsemble(col0)) {
      result.personnelEnsemble = r;
    }

    // honoraires
    if (!result.honoraires && ROW_LABELS.honoraires(col0)) {
      result.honoraires = r;
    }

    // Personnel individual rows (in col1, before charges sociales section)
    // "CHARGES SOCIALES" label in col0 marks the start of charges section
    if (col0 === "CHARGES SOCIALES") {
      inChargesSociales = true;
    }

    if (!inChargesSociales) {
      for (const key of PERSONNEL_ROW_KEYS) {
        if (result[key] == null && ROW_LABELS[key](col1)) {
          result[key] = r;
        }
      }
    }

    // Charges sociales individual rows (in col1, after "CHARGES SOCIALES" header)
    if (inChargesSociales) {
      for (const key of CHARGES_ROW_KEYS) {
        if (result[key] == null && ROW_LABELS[key](col1)) {
          result[key] = r;
        }
      }
    }

    // Camera (first in moyens techniques block)
    if (!result.camera && (ROW_LABELS.camera(col1) || ROW_LABELS.camera(col0))) {
      result.camera = r;
    }
    if (!result.hfSon && ROW_LABELS.hfSon(col1)) result.hfSon = r;
    if (!result.montage && ROW_LABELS.montage(col1)) result.montage = r;
    if (!result.mixage && ROW_LABELS.mixage(col1)) result.mixage = r;
    if (!result.etalonnage && ROW_LABELS.etalonnage(col1)) result.etalonnage = r;
    if (!result.autre && ROW_LABELS.autre(col1)) result.autre = r;
    if (!result.drone && ROW_LABELS.drone(col1)) result.drone = r;
    if (!result.pad && ROW_LABELS.pad(col1)) result.pad = r;

    // Other costs
    if (!result.prodDeleguee && (ROW_LABELS.prodDeleguee(col1) || ROW_LABELS.prodDeleguee(col0))) {
      result.prodDeleguee = r;
    }
    if (!result.assurances && ROW_LABELS.assurances(col1)) result.assurances = r;
    if (!result.fraisGeneraux && ROW_LABELS.fraisGeneraux(col1)) result.fraisGeneraux = r;
    if (!result.fraisFinanciers && ROW_LABELS.fraisFinanciers(col1)) result.fraisFinanciers = r;
    if (!result.divers && ROW_LABELS.divers(col1)) result.divers = r;
    if (!result.imprevus && ROW_LABELS.imprevus(col1)) result.imprevus = r;

    // Totals
    if (!result.transports && ROW_LABELS.transports(col0)) result.transports = r;
    if (!result.totalAvecTransports && ROW_LABELS.totalAvecTransports(col0)) {
      result.totalAvecTransports = r;
    }
    if (!result.totalSansTransports && ROW_LABELS.totalSansTransports(col0) && !ROW_LABELS.totalAvecTransports(col0)) {
      result.totalSansTransports = r;
    }
    if (!result.coutMinute && ROW_LABELS.coutMinute(col0)) result.coutMinute = r;
  }

  // personnelSubtotal: the "SOUS TOTAL" row just before honoraires
  // chargesSociales: the "SOUS-TOTAL" row just before honoraires but after personnelSubtotal
  if (result.honoraires != null && result.personnelEnsemble != null) {
    // Scan backwards from personnelEnsemble to find charges sociales subtotal and personnel subtotal
    for (let r = result.personnelEnsemble - 1; r >= 0; r--) {
      const col0 = String(data[r]?.[0] || "").trim();
      if ((col0 === "SOUS-TOTAL" || col0 === "SOUS TOTAL") && result.chargesSociales == null) {
        result.chargesSociales = r;
      } else if ((col0 === "SOUS TOTAL" || col0 === "SOUS-TOTAL") && result.personnelSubtotal == null && result.chargesSociales != null) {
        result.personnelSubtotal = r;
        break;
      }
    }
  }

  return result;
}

function extractYear(row: Row, titleCol: number): number | null {
  // Look for a 4-digit year near the title column
  for (let c = titleCol; c <= titleCol + 2; c++) {
    const val = row[c];
    if (typeof val === "number" && val >= 2000 && val <= 2099) return val;
    if (typeof val === "string") {
      const match = val.match(/\b(20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

function formatProducerName(sheetName: string): string {
  return sheetName
    .replace(/ BDD$/, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const EXCLUDED_SHEETS = new Set([
  "Synthèse coûts moyens",
  "Graphiques Analyse",
  "Analyse Minimas Salariaux",
  "Conventions collectives",
  "MODELE",
]);

// ---------------------------------------------------------------------------
// Parse: pure function that turns the XLSM into production records.
// Exported so other scripts (e.g. anonymization for the open-source demo
// dataset) can consume the same parsing without writing to the database.
// ---------------------------------------------------------------------------

export interface ParsedProduction {
  producteur: string;
  titre: string;
  dureeMinutes: number;
  typeProduction: string;
  totalDevis: number;
  coutMinute: number;
  confiance: "haute" | "moyenne" | "basse";
  grilleCnc: Record<string, unknown>;
  meta: Record<string, unknown>;
  verificationMinima: unknown[];
  anomalies: unknown[];
  postesNonClasses: unknown[];
  dateDevis: string | null;
  formatSource: string;
  cncFunding: boolean;
}

export function parseAllProductions(spreadsheetPath: string): ParsedProduction[] {
  const workbook = XLSX.readFile(spreadsheetPath);
  const records: ParsedProduction[] = [];

  const seenTitles = new Set<string>();
  const normalizeTitle = (producer: string, title: string) =>
    (producer + "|" + title).toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9|]/g, " ").replace(/\s+/g, " ").trim();

  for (const sheetName of workbook.SheetNames) {
    if (EXCLUDED_SHEETS.has(sheetName)) continue;

    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as SheetData;

    const producerName = formatProducerName(sheetName);
    const rowIdx = findRowIndices(data);

    let titleRowIdx = -1;
    for (let r = 0; r <= 2; r++) {
      const row = data[r] || [];
      for (let c = 4; c < row.length; c++) {
        if (row[c] && typeof row[c] === "string" && String(row[c]).trim().length > 3) {
          titleRowIdx = r;
          break;
        }
      }
      if (titleRowIdx >= 0) break;
    }
    if (titleRowIdx < 0) continue;

    const durationRowIdx = titleRowIdx + 1;
    const yearRowIdx = titleRowIdx + 2;

    const titleRow = data[titleRowIdx] || [];
    const prodColumns: number[] = [];
    for (let c = 4; c < titleRow.length; c++) {
      const val = titleRow[c];
      if (val && typeof val === "string" && val.trim().length > 3) prodColumns.push(c);
    }

    const CNC_FUNDED = new Set([
      "Irak: la guerre de la soif",
      "HAMAS LA STRATEGIE DU CHAOS",
      "Karabagh : Quand passent les cigognes",
      "Cuba : Roadmovie dans une île à la dérive",
    ]);

    for (const titleCol of prodColumns) {
      const rateCol = titleCol;
      const daysCol = titleCol + 1;
      const amountCol = titleCol + 2;
      const title = String(data[titleRowIdx]?.[titleCol] || "").trim();
      if (!title) continue;

      const titleKey = normalizeTitle(producerName, title);
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      const rawDuration = Number(data[durationRowIdx]?.[titleCol]);
      const duration = rawDuration > 0 ? rawDuration : 24;
      const year = extractYear(data[yearRowIdx] || [], titleCol);
      const labelCol = 1;

      const amt = (key: string): number => {
        const r = rowIdx[key];
        if (r == null) return 0;
        return Number(data[r]?.[amountCol]) || 0;
      };
      const rate = (key: string): number => {
        const r = rowIdx[key];
        if (r == null) return 0;
        return Number(data[r]?.[rateCol]) || 0;
      };
      const days = (key: string): number => {
        const r = rowIdx[key];
        if (r == null) return 0;
        return Number(data[r]?.[daysCol]) || 0;
      };

      const postes = PERSONNEL_ROW_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => {
          const r = rowIdx[key]!;
          const label = String(data[r]?.[labelCol] ?? "").trim();
          const roleKey = mapXlsxLabelToRoleKey(label);
          const d = days(key);
          const tj = rate(key);
          const isForfait = d <= 1 && tj > 800;
          return {
            poste: label,
            role_key: roleKey ?? key,
            nombre_jours: d,
            tarif_journalier: tj,
            total: amt(key),
            confiance: "haute" as const,
            type_contrat: isForfait ? "forfait" as const : "salarie" as const,
          };
        });

      const droitsLignes = DROITS_ROW_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => ({
          poste: String(data[rowIdx[key]!]?.[labelCol] ?? "").trim(),
          montant: amt(key),
          sous_categorie: toSnakeCase(key),
        }));

      const chargesLignes = CHARGES_ROW_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => ({
          poste: String(data[rowIdx[key]!]?.[labelCol] ?? "").trim(),
          montant: amt(key),
          sous_categorie: toSnakeCase(key),
        }));

      const moyensTechniquesLignes = MOYENS_TECHNIQUES_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => ({
          poste: String(data[rowIdx[key]!]?.[labelCol] ?? "").trim(),
          montant: amt(key),
          sous_categorie: toSnakeCase(key),
        }));

      const postProdLignes = POST_PROD_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => ({
          poste: String(data[rowIdx[key]!]?.[labelCol] ?? "").trim(),
          montant: amt(key),
          sous_categorie: toSnakeCase(key),
        }));

      const imprevusLignes = IMPREVUS_FG_PD_KEYS
        .filter((key) => rowIdx[key] != null && amt(key) > 0)
        .map((key) => ({
          poste: String(data[rowIdx[key]!]?.[labelCol] ?? "").trim(),
          montant: amt(key),
          sous_categorie: toSnakeCase(key),
        }));

      const droitsArtistiques = amt("droitsArtistiques");
      const personnelSubtotal = amt("personnelSubtotal");
      const honoraires = amt("honoraires");
      const personnel = personnelSubtotal + honoraires;
      const chargesSocialesTotal = amt("chargesSociales");
      const transport = amt("transports");
      const tournage = amt("camera") + amt("hfSon") + amt("autre") + amt("drone");
      const postProd = amt("montage") + amt("mixage") + amt("etalonnage") + amt("pad");
      const assurance = amt("assurances");
      const imprevu_fg_pd =
        amt("prodDeleguee") + amt("fraisGeneraux") + amt("fraisFinanciers") + amt("divers") + amt("imprevus");

      const totalDevis = amt("totalAvecTransports");
      if (totalDevis <= 0) continue;
      const coutMinute = duration > 0 ? Math.round((totalDevis / duration) * 100) / 100 : 0;

      const verificationMinima = postes
        .filter((p) => p.tarif_journalier > 0)
        .map((p) => {
          const ccEntry = CC_FALLBACK_RATES[p.role_key];
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
          const ecartPct = minimum > 0 ? Math.round(((p.tarif_journalier - minimum) / minimum) * 1000) / 10 : 0;
          let statut: "conforme" | "attention" | "non_conforme";
          if (p.tarif_journalier < minimum) statut = "non_conforme";
          else if (ecartPct <= 5) statut = "attention";
          else statut = "conforme";
          return {
            poste: p.poste,
            tarif_journalier: p.tarif_journalier,
            minimum_cc: minimum,
            ecart_pourcent: ecartPct,
            statut,
          };
        });

      const csPersonnelTotal = chargesLignes
        .filter((l) => l.sous_categorie !== "agessa")
        .reduce((sum, l) => sum + l.montant, 0);
      const taux_moyen =
        personnel > 0 && csPersonnelTotal > 0 ? Math.round((csPersonnelTotal / personnel) * 100) / 100 : null;

      const grilleCnc = {
        "1_droits_artistiques": { lignes: droitsLignes, total: droitsArtistiques },
        "2_personnel": { postes, total: personnel },
        "3_interpretation": { lignes: [], total: 0 },
        "4_charges_sociales": { lignes: chargesLignes, taux_moyen, total: chargesSocialesTotal },
        "5_decors_costumes": { lignes: [], total: 0 },
        "6_transport": { lignes: [], total: transport },
        "7_tournage": { lignes: moyensTechniquesLignes, total: tournage },
        "8_post_production": { lignes: postProdLignes, total: postProd },
        "9_assurance": {
          lignes: assurance > 0 ? [{ poste: "ASSURANCES", montant: assurance, sous_categorie: "assurances" }] : [],
          total: assurance,
        },
        "10_imprevus_fg_pd": { lignes: imprevusLignes, total: imprevu_fg_pd },
      };

      records.push({
        producteur: producerName,
        titre: title,
        dureeMinutes: duration,
        typeProduction: DEFAULT_TYPE_PRODUCTION,
        totalDevis,
        coutMinute,
        confiance: "haute",
        grilleCnc,
        meta: {
          producteur: producerName,
          titre: title,
          duree_minutes: duration,
          type_production: DEFAULT_TYPE_PRODUCTION,
          date_devis: year ? `${year}-01-01` : null,
          cnc_funding: CNC_FUNDED.has(title) || undefined,
        },
        dateDevis: year ? `${year}-01-01` : null,
        verificationMinima,
        anomalies: [],
        postesNonClasses: [],
        formatSource: "seed-history",
        cncFunding: CNC_FUNDED.has(title),
      });
    }
  }

  return records;
}
