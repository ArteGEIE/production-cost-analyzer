// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/render";
import { CcMinimaTable } from "./cc-minima-table";
import type { VerificationMinima } from "@/lib/schemas/devis";

describe("CcMinimaTable", () => {
  it("renders nothing when verificationMinima is empty", () => {
    const { container } = render(<CcMinimaTable verificationMinima={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a row for each verification entry", () => {
    const data: VerificationMinima[] = [
      { poste: "Chef opérateur", tarif_journalier: 350, minimum_cc: 281.54, ecart_pourcent: 24.32, statut: "conforme" },
      { poste: "Réalisateur", tarif_journalier: 200, minimum_cc: null, ecart_pourcent: null, statut: "hors_nomenclature" },
    ];

    render(<CcMinimaTable verificationMinima={data} />);

    expect(screen.getByText("Chef opérateur")).toBeTruthy();
    expect(screen.getByText("Réalisateur")).toBeTruthy();
    expect(screen.getByText("Conforme")).toBeTruthy();
    expect(screen.getByText("Hors nomenclature")).toBeTruthy();
  });

  it("displays non_conforme badge for non-compliant entries", () => {
    const data: VerificationMinima[] = [
      { poste: "Chef op", tarif_journalier: 200, minimum_cc: 281.54, ecart_pourcent: -28.96, statut: "non_conforme" },
    ];

    render(<CcMinimaTable verificationMinima={data} />);
    expect(screen.getByText("Non conforme")).toBeTruthy();
  });
});
