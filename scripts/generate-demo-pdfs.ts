/**
 * Generate fictional devis PDFs for the demo upload flow.
 *
 * Run: npx tsx scripts/generate-demo-pdfs.ts
 *
 * Output: demo-data/pdfs/*.pdf — committed alongside demo-data/history.json.
 * The producer + title pairs intentionally do NOT overlap with the seeded
 * history so a demo visitor can upload one and watch a fresh extraction land.
 */

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface BudgetLine {
  poste: string;
  jours: number;
  tarif: number;
}

interface CategoryLine {
  label: string;
  amount: number;
}

interface DemoBudget {
  filename: string;
  producer: { name: string; address: string[] };
  title: string;
  duration: number;
  director: string;
  location: string;
  type: string;
  personnel: BudgetLine[];
  categories: CategoryLine[];
}

// ─── Demo budget #1: a coastal documentary by Lumière Pictures ─────────────

const demoBudget: DemoBudget = {
  filename: "devis-vendanges-noires.pdf",
  producer: {
    name: "Lumière Pictures",
    address: [
      "8 rue de la Mouffetard",
      "75005 Paris",
      "SIRET : 884 521 309 00014",
    ],
  },
  title: "Vendanges noires",
  duration: 26,
  director: "Camille Roux",
  location: "Beaujolais — Lyon",
  type: "Documentaire",
  personnel: [
    { poste: "Réalisateur", jours: 22, tarif: 360 },
    { poste: "Directeur de production", jours: 14, tarif: 260 },
    { poste: "Chargé de production", jours: 12, tarif: 200 },
    { poste: "Chef opérateur", jours: 11, tarif: 310 },
    { poste: "Assistant caméra", jours: 11, tarif: 185 },
    { poste: "Ingénieur du son", jours: 11, tarif: 340 },
    { poste: "Chef monteur", jours: 14, tarif: 295 },
    { poste: "Étalonneur", jours: 4, tarif: 280 },
    { poste: "Mixeur", jours: 3, tarif: 340 },
    { poste: "Assistant de production", jours: 18, tarif: 195 },
  ],
  categories: [
    { label: "1. Droits artistiques (auteurs, musique, archives)", amount: 5800 },
    { label: "2. Personnel", amount: 0 }, // computed
    { label: "3. Interprétation", amount: 0 },
    { label: "4. Charges sociales (55%)", amount: 0 }, // computed
    { label: "5. Décors et costumes", amount: 0 },
    { label: "6. Transport, défraiement, régie", amount: 6400 },
    { label: "7. Moyens techniques de tournage", amount: 9200 },
    { label: "8. Post-production", amount: 8800 },
    { label: "9. Assurance", amount: 1700 },
    { label: "10. Imprévus, frais généraux, production déléguée", amount: 7500 },
  ],
};

// ─── PDF generation ────────────────────────────────────────────────────────

function formatEuro(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePdf(spec: DemoBudget, outDir: string): void {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const outPath = resolve(outDir, spec.filename);
  const stream = createWriteStream(outPath);
  doc.pipe(stream);

  const personnelTotal = spec.personnel.reduce((sum, p) => sum + p.jours * p.tarif, 0);
  const chargesTotal = Math.round(personnelTotal * 0.55);
  spec.categories[1].amount = personnelTotal;
  spec.categories[3].amount = chargesTotal;

  const grandTotal = spec.categories.reduce((sum, c) => sum + c.amount, 0);
  const costPerMinute = grandTotal / spec.duration;

  // Producer header
  doc.fontSize(10).font("Helvetica");
  doc.text(spec.producer.name, { align: "left" });
  for (const line of spec.producer.address) doc.text(line);
  doc.moveDown(1.5);

  // Title
  doc.fontSize(18).font("Helvetica-Bold");
  doc.text("DEVIS DE PRODUCTION", { align: "center" });
  doc.moveDown(0.5);

  // Metadata
  doc.fontSize(10).font("Helvetica");
  const metaRows: [string, string][] = [
    ["Titre", spec.title],
    ["Producteur", spec.producer.name],
    ["Réalisateur", spec.director],
    ["Durée", `${spec.duration} min`],
    ["Lieu de tournage", spec.location],
    ["Type de production", spec.type],
  ];
  for (const [label, value] of metaRows) {
    doc.font("Helvetica-Bold").text(`${label} : `, { continued: true });
    doc.font("Helvetica").text(value);
  }
  doc.moveDown(1);

  // Personnel detail
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("DÉTAIL PERSONNEL");
  doc.moveDown(0.3);

  const colX = [50, 250, 330, 410, 490];
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Poste", colX[0], doc.y, { width: 190 });
  const headerY = doc.y - 11;
  doc.text("Jours", colX[1], headerY, { width: 70, align: "right" });
  doc.text("Tarif/jour (€)", colX[2], headerY, { width: 70, align: "right" });
  doc.text("Total (€)", colX[3], headerY, { width: 70, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(9);
  for (const p of spec.personnel) {
    const lineTotal = p.jours * p.tarif;
    const y = doc.y;
    doc.text(p.poste, colX[0], y, { width: 190 });
    doc.text(String(p.jours), colX[1], y, { width: 70, align: "right" });
    doc.text(formatEuro(p.tarif), colX[2], y, { width: 70, align: "right" });
    doc.text(formatEuro(lineTotal), colX[3], y, { width: 70, align: "right" });
    doc.moveDown(0.15);
  }

  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold");
  const stY = doc.y;
  doc.text("SOUS-TOTAL", colX[0], stY, { width: 190 });
  doc.text(formatEuro(personnelTotal), colX[3], stY, { width: 70, align: "right" });
  doc.moveDown(1.5);

  // Summary by category
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("RÉCAPITULATIF PAR CATÉGORIE");
  doc.moveDown(0.3);

  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Catégorie", colX[0], doc.y, { width: 350 });
  const shY = doc.y - 11;
  doc.text("Montant (€)", colX[3], shY, { width: 70, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(9);
  for (const cat of spec.categories) {
    const y = doc.y;
    doc.text(cat.label, colX[0], y, { width: 350 });
    doc.text(formatEuro(cat.amount), colX[3], y, { width: 70, align: "right" });
    doc.moveDown(0.15);
  }

  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica-Bold");
  const gtY = doc.y;
  doc.text("TOTAL GÉNÉRAL", colX[0], gtY, { width: 350 });
  doc.text(`${formatEuro(grandTotal)} €`, colX[3], gtY, { width: 70, align: "right" });
  doc.moveDown(0.5);

  doc.fontSize(9).font("Helvetica");
  const cpmY = doc.y;
  doc.text("Coût / minute :", colX[0], cpmY, { width: 350 });
  doc.text(`${formatEuro(costPerMinute)} €`, colX[3], cpmY, { width: 70, align: "right" });

  doc.end();

  stream.on("finish", () => {
    console.log(`✓ ${spec.filename} (${formatEuro(grandTotal)} €, ${spec.duration} min)`);
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────

const outDir = resolve(__dirname, "..", "demo-data", "pdfs");
mkdirSync(outDir, { recursive: true });

console.log(`Generating demo PDFs into ${outDir}...\n`);
generatePdf(demoBudget, outDir);
