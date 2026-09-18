// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@/test/render";
import { SummaryCard } from "./summary-card";
import type { Anomalie } from "@/lib/schemas/devis";

const makeAnomalie = (overrides: Partial<Anomalie> = {}): Anomalie => ({
  code: "R1",
  params: {},
  severite: "ÉLEVÉE",
  ...overrides,
});

describe("SummaryCard", () => {
  afterEach(() => cleanup());
  it("shows 'Aucune anomalie critique' when no high severity", () => {
    render(<SummaryCard anomalies={[makeAnomalie({ severite: "INFO", code: "R4" })]} />);
    expect(screen.getByText("Aucune non-conformité critique")).toBeTruthy();
  });

  it("shows non-conformité count when high severity present", () => {
    render(
      <SummaryCard
        anomalies={[
          makeAnomalie({ severite: "ÉLEVÉE" }),
          makeAnomalie({ severite: "ÉLEVÉE", code: "R1" }),
        ]}
      />,
    );
    expect(screen.getByText("2 non-conformités détectées")).toBeTruthy();
  });

  it("shows severity dot counts", () => {
    render(
      <SummaryCard
        anomalies={[
          makeAnomalie({ severite: "ÉLEVÉE" }),
          makeAnomalie({ severite: "ATTENTION", code: "R3" }),
          makeAnomalie({ severite: "INFO", code: "R4" }),
        ]}
      />,
    );
    expect(screen.getByText("1 critique")).toBeTruthy();
    expect(screen.getByText("1 attention")).toBeTruthy();
    expect(screen.getByText("1 info")).toBeTruthy();
  });

  it("shows 'Aucune anomalie' when empty", () => {
    render(<SummaryCard anomalies={[]} />);
    expect(screen.getByText("Aucune non-conformité")).toBeTruthy();
  });
});
