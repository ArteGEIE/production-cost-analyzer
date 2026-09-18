/**
 * Generate 3 sample budget PDFs (FR, DE, EN) for integration testing.
 *
 * Run: npx tsx fixtures/generate-pdfs.ts
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

interface BudgetSpec {
  filename: string;
  lang: "fr" | "de" | "en";
  producer: { name: string; address: string[] };
  title: string;
  duration: number;
  broadcaster: string;
  director: string;
  location: string;
  type: string;
  personnel: BudgetLine[];
  categories: CategoryLine[];
  headers: {
    producer: string;
    title: string;
    duration: string;
    broadcaster: string;
    director: string;
    location: string;
    type: string;
    poste: string;
    days: string;
    rate: string;
    total: string;
    category: string;
    amount: string;
    grandTotal: string;
    costPerMinute: string;
    personnelTitle: string;
    summaryTitle: string;
    budgetTitle: string;
  };
}

// ─── French budget ────────────────────────────────────────────

const frBudget: BudgetSpec = {
  filename: "devis-fr-sample.pdf",
  lang: "fr",
  producer: {
    name: "Les Films du Rhin",
    address: ["12 rue du Vieux-Marché-aux-Poissons", "67000 Strasbourg", "SIRET : 123 456 789 00012"],
  },
  title: "Strasbourg, carrefour de l'Europe",
  duration: 52,
  broadcaster: "ARTE",
  director: "Marie Dupont",
  location: "Strasbourg et environs",
  type: "Documentaire",
  headers: {
    producer: "Producteur", title: "Titre", duration: "Durée", broadcaster: "Diffuseur",
    director: "Réalisateur", location: "Lieu de tournage", type: "Type de production",
    poste: "Poste", days: "Jours", rate: "Tarif/jour (€)", total: "Total (€)",
    category: "Catégorie", amount: "Montant (€)", grandTotal: "TOTAL GÉNÉRAL",
    costPerMinute: "Coût / minute", personnelTitle: "DÉTAIL PERSONNEL",
    summaryTitle: "RÉCAPITULATIF PAR CATÉGORIE", budgetTitle: "DEVIS DE PRODUCTION",
  },
  personnel: [
    { poste: "Réalisateur", jours: 25, tarif: 350 },
    { poste: "Directeur de production", jours: 15, tarif: 250 },
    { poste: "Chargé de production", jours: 12, tarif: 195 },
    { poste: "Chef opérateur", jours: 10, tarif: 300 },
    { poste: "Assistant caméra", jours: 10, tarif: 180 },
    { poste: "Ingénieur du son", jours: 10, tarif: 350 },
    { poste: "Chef monteur", jours: 12, tarif: 300 },
    { poste: "Assistant de production", jours: 20, tarif: 190 },
  ],
  categories: [
    { label: "1. Droits artistiques (auteurs, musique, archives)", amount: 6500 },
    { label: "2. Personnel", amount: 0 }, // computed from personnel
    { label: "3. Interprétation", amount: 0 },
    { label: "4. Charges sociales (55%)", amount: 0 }, // computed
    { label: "5. Décors et costumes", amount: 0 },
    { label: "6. Transport, défraiement, régie", amount: 5200 },
    { label: "7. Moyens techniques de tournage", amount: 8500 },
    { label: "8. Post-production", amount: 9400 },
    { label: "9. Assurance", amount: 1500 },
    { label: "10. Imprévus, frais généraux, production déléguée", amount: 8000 },
  ],
};

// ─── German budget ────────────────────────────────────────────

const deBudget: BudgetSpec = {
  filename: "devis-de-sample.pdf",
  lang: "de",
  producer: {
    name: "Berliner Dokfilm GmbH",
    address: ["Kurfürstendamm 45", "10719 Berlin", "HRB 987654 B"],
  },
  title: "Berlin: Zeitgeist einer Metropole",
  duration: 26,
  broadcaster: "ZDF",
  director: "Hans Müller",
  location: "Berlin",
  type: "Reportage",
  headers: {
    producer: "Produzent", title: "Titel", duration: "Dauer", broadcaster: "Sender",
    director: "Regisseur", location: "Drehort", type: "Produktionsart",
    poste: "Position", days: "Tage", rate: "Tagessatz (€)", total: "Gesamt (€)",
    category: "Kategorie", amount: "Betrag (€)", grandTotal: "GESAMTSUMME",
    costPerMinute: "Kosten / Minute", personnelTitle: "PERSONALKOSTEN (DETAIL)",
    summaryTitle: "KOSTENÜBERSICHT", budgetTitle: "KOSTENVORANSCHLAG",
  },
  personnel: [
    { poste: "Regisseur", jours: 15, tarif: 320 },
    { poste: "Produktionsleiter", jours: 10, tarif: 240 },
    { poste: "Produktionskoordinator", jours: 8, tarif: 195 },
    { poste: "Kameramann", jours: 8, tarif: 300 },
    { poste: "Kameraassistent", jours: 8, tarif: 175 },
    { poste: "Tonmeister", jours: 8, tarif: 350 },
    { poste: "Cutter", jours: 8, tarif: 290 },
  ],
  categories: [
    { label: "1. Künstlerische Rechte (Autoren, Musik, Archiv)", amount: 3000 },
    { label: "2. Personalkosten", amount: 0 },
    { label: "3. Darsteller", amount: 0 },
    { label: "4. Sozialabgaben (55%)", amount: 0 },
    { label: "5. Ausstattung und Kostüme", amount: 0 },
    { label: "6. Transport, Spesen, Organisation", amount: 3500 },
    { label: "7. Technische Mittel (Dreh)", amount: 4200 },
    { label: "8. Postproduktion", amount: 4500 },
    { label: "9. Versicherung", amount: 800 },
    { label: "10. Unvorhergesehenes, Gemeinkosten, Produzentenhonorar", amount: 4200 },
  ],
};

// ─── English budget ───────────────────────────────────────────

const enBudget: BudgetSpec = {
  filename: "devis-en-sample.pdf",
  lang: "en",
  producer: {
    name: "Thames Productions Ltd",
    address: ["27 Southbank Centre", "London SE1 8XX", "Company No. 12345678"],
  },
  title: "London Bridges: A River Story",
  duration: 30,
  broadcaster: "BBC",
  director: "Sarah Williams",
  location: "London",
  type: "Documentary",
  headers: {
    producer: "Producer", title: "Title", duration: "Duration", broadcaster: "Broadcaster",
    director: "Director", location: "Shooting location", type: "Production type",
    poste: "Position", days: "Days", rate: "Day rate (€)", total: "Total (€)",
    category: "Category", amount: "Amount (€)", grandTotal: "GRAND TOTAL",
    costPerMinute: "Cost / minute", personnelTitle: "CREW BREAKDOWN",
    summaryTitle: "BUDGET SUMMARY BY CATEGORY", budgetTitle: "PRODUCTION BUDGET",
  },
  personnel: [
    { poste: "Director", jours: 18, tarif: 350 },
    { poste: "Production Manager", jours: 12, tarif: 250 },
    { poste: "Production Coordinator", jours: 10, tarif: 190 },
    { poste: "Director of Photography", jours: 8, tarif: 320 },
    { poste: "Camera Assistant", jours: 8, tarif: 175 },
    { poste: "Sound Engineer", jours: 8, tarif: 340 },
    { poste: "Editor", jours: 10, tarif: 300 },
    { poste: "Colorist", jours: 3, tarif: 300 },
  ],
  categories: [
    { label: "1. Artistic rights (writers, music, archive)", amount: 4000 },
    { label: "2. Crew / Personnel", amount: 0 },
    { label: "3. Performers / Talent", amount: 0 },
    { label: "4. Social charges / Benefits (55%)", amount: 0 },
    { label: "5. Sets & Costumes", amount: 0 },
    { label: "6. Transport, per diem, logistics", amount: 4000 },
    { label: "7. Shooting equipment", amount: 5500 },
    { label: "8. Post-production", amount: 5500 },
    { label: "9. Insurance", amount: 1000 },
    { label: "10. Contingency, overhead, executive producer fee", amount: 4000 },
  ],
};

// ─── PDF generation ───────────────────────────────────────────

function formatEuro(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePdf(spec: BudgetSpec): void {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const outPath = resolve(__dirname, spec.filename);
  const stream = createWriteStream(outPath);
  doc.pipe(stream);

  const h = spec.headers;

  // --- Compute personnel total ---
  const personnelTotal = spec.personnel.reduce((sum, p) => sum + p.jours * p.tarif, 0);
  const chargesTotal = Math.round(personnelTotal * 0.55);

  // Update categories
  spec.categories[1].amount = personnelTotal; // cat 2
  spec.categories[3].amount = chargesTotal;   // cat 4

  const grandTotal = spec.categories.reduce((sum, c) => sum + c.amount, 0);
  const costPerMinute = grandTotal / spec.duration;

  // --- Header / Producer info ---
  doc.fontSize(10).font("Helvetica");
  doc.text(spec.producer.name, { align: "left" });
  for (const line of spec.producer.address) {
    doc.text(line);
  }
  doc.moveDown(1.5);

  // --- Title ---
  doc.fontSize(18).font("Helvetica-Bold");
  doc.text(h.budgetTitle, { align: "center" });
  doc.moveDown(0.5);

  // --- Metadata table ---
  doc.fontSize(10).font("Helvetica");
  const metaRows = [
    [h.title, spec.title],
    [h.producer, spec.producer.name],
    [h.director, spec.director],
    [h.broadcaster, spec.broadcaster],
    [h.duration, `${spec.duration} min`],
    [h.location, spec.location],
    [h.type, spec.type],
  ];
  for (const [label, value] of metaRows) {
    doc.font("Helvetica-Bold").text(`${label} : `, { continued: true });
    doc.font("Helvetica").text(value);
  }
  doc.moveDown(1);

  // --- Personnel detail table ---
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text(h.personnelTitle);
  doc.moveDown(0.3);

  // Table header
  const colX = [50, 250, 330, 410, 490];
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text(h.poste, colX[0], doc.y, { width: 190 });
  const headerY = doc.y - 11;
  doc.text(h.days, colX[1], headerY, { width: 70, align: "right" });
  doc.text(h.rate, colX[2], headerY, { width: 70, align: "right" });
  doc.text(h.total, colX[3], headerY, { width: 70, align: "right" });
  doc.moveDown(0.3);

  // Separator line
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  // Personnel rows
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

  // Personnel subtotal
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold");
  const stY = doc.y;
  doc.text("SOUS-TOTAL", colX[0], stY, { width: 190 });
  doc.text(formatEuro(personnelTotal), colX[3], stY, { width: 70, align: "right" });
  doc.moveDown(1.5);

  // --- Summary by category ---
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text(h.summaryTitle);
  doc.moveDown(0.3);

  // Header
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text(h.category, colX[0], doc.y, { width: 350 });
  const shY = doc.y - 11;
  doc.text(h.amount, colX[3], shY, { width: 70, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  // Category rows
  doc.font("Helvetica").fontSize(9);
  for (const cat of spec.categories) {
    const y = doc.y;
    doc.text(cat.label, colX[0], y, { width: 350 });
    doc.text(formatEuro(cat.amount), colX[3], y, { width: 70, align: "right" });
    doc.moveDown(0.15);
  }

  // Grand total
  doc.moveTo(colX[0], doc.y).lineTo(colX[3] + 70, doc.y).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica-Bold");
  const gtY = doc.y;
  doc.text(h.grandTotal, colX[0], gtY, { width: 350 });
  doc.text(`${formatEuro(grandTotal)} €`, colX[3], gtY, { width: 70, align: "right" });
  doc.moveDown(0.5);

  // Cost per minute
  doc.fontSize(9).font("Helvetica");
  const cpmY = doc.y;
  doc.text(`${h.costPerMinute} :`, colX[0], cpmY, { width: 350 });
  doc.text(`${formatEuro(costPerMinute)} €`, colX[3], cpmY, { width: 70, align: "right" });

  doc.end();

  stream.on("finish", () => {
    console.log(`✓ ${spec.filename} (${formatEuro(grandTotal)} €, ${spec.duration} min)`);
  });
}

// ─── Run ──────────────────────────────────────────────────────

console.log("Generating test PDFs...\n");
generatePdf(frBudget);
generatePdf(deBudget);
generatePdf(enBudget);
