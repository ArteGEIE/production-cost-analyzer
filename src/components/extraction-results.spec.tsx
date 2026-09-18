// @vitest-environment jsdom
import { render, screen } from "@/test/render";
import { describe, expect, it } from "vitest";

import { ExtractionResults } from "./extraction-results";
import { ConfidenceBadge } from "./confidence-badge";

const sampleData = {
  meta: {
    producteur: "Les Films du Rhin",
    titre: "Strasbourg, carrefour de l'Europe",
    duree_minutes: 52,
    diffuseur: "ARTE",
    lieu_tournage: "Strasbourg",
    type_production: "documentaire",
  },
  grille_cnc: {
    "1_droits_artistiques": { lignes: [{ poste: "Auteur", montant: 5000 }], total: 5000 },
    "2_personnel": { postes: [], total: 10000 },
    "3_interpretation": { lignes: [], total: 0 },
    "4_charges_sociales": { lignes: [], total: 5500 },
    "5_decors_costumes": { lignes: [], total: 0 },
    "6_transport": { lignes: [{ poste: "Avion", montant: 4000 }], total: 4000 },
    "7_tournage": { lignes: [{ poste: "Caméra", montant: 4500 }], total: 4500 },
    "8_post_production": { lignes: [{ poste: "Montage", montant: 6500 }], total: 6500 },
    "9_assurance": { lignes: [{ poste: "Assurance prod", montant: 1500 }], total: 1500 },
    "10_imprevus_fg_pd": { lignes: [{ poste: "Imprévus", montant: 10000 }], total: 10000 },
  },
  total_devis: 47000,
  cout_minute: 903.85,
  verification_minima: [],
  anomalies: [],
  postes_non_classes: [],
  confiance: "haute" as const,
};

describe("ExtractionResults", () => {
  it("should display metadata fields", () => {
    render(<ExtractionResults data={sampleData} />);

    expect(screen.getByText("Les Films du Rhin")).toBeDefined();
    expect(screen.getByText("Strasbourg, carrefour de l'Europe")).toBeDefined();
    expect(screen.getByText("52 min")).toBeDefined();
    expect(screen.getByText("ARTE")).toBeDefined();
    expect(screen.getByText("documentaire")).toBeDefined();
  });

  it("should display CNC grid with 10 categories", () => {
    render(<ExtractionResults data={sampleData} />);
    // Dual labels mean some text appears twice per row
    expect(screen.getAllByText(/Droits artistiques/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Post-production/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Assurance/).length).toBeGreaterThanOrEqual(1);
  });

  it("should display totals", () => {
    render(<ExtractionResults data={sampleData} />);
    expect(screen.getAllByText(/Total/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Coût / minute").length).toBeGreaterThanOrEqual(1);
  });

  it("should handle partial data during streaming", () => {
    render(<ExtractionResults data={{ meta: { titre: "Test" } }} isStreaming />);
    expect(screen.getByText("Test")).toBeDefined();
    // Shimmer class applied to cards when streaming and data incomplete
    const cards = document.querySelectorAll(".streaming-shimmer");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("should display unclassified items when present", () => {
    const data = { ...sampleData, postes_non_classes: ["Poste mystère"] };
    render(<ExtractionResults data={data} />);
    expect(screen.getByText("Poste mystère")).toBeDefined();
  });
});

describe("ConfidenceBadge", () => {
  it("should render haute badge", () => {
    const { container } = render(<ConfidenceBadge confiance="haute" />);
    expect(container.textContent).toContain("Confiance haute");
  });

  it("should render moyenne badge", () => {
    const { container } = render(<ConfidenceBadge confiance="moyenne" />);
    expect(container.textContent).toContain("Confiance moyenne");
  });

  it("should render basse badge", () => {
    const { container } = render(<ConfidenceBadge confiance="basse" />);
    expect(container.textContent).toContain("Confiance basse");
  });

  it("should render nothing when confiance is undefined", () => {
    const { container } = render(<ConfidenceBadge />);
    expect(container.innerHTML).toBe("");
  });
});
