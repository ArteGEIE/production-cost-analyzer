import { describe, expect, it } from "vitest";
import {
  computeDeviation,
  computeCategoryDeviations,
  computeRank,
  grilleToPctStructure,
} from "./compute-stats";

describe("computeDeviation", () => {
  it("returns positive deviation when current > avg", () => {
    expect(computeDeviation(130, 100)).toBeCloseTo(0.3);
  });
  it("returns negative deviation when current < avg", () => {
    expect(computeDeviation(70, 100)).toBeCloseTo(-0.3);
  });
  it("returns 0 when avg is 0", () => {
    expect(computeDeviation(100, 0)).toBe(0);
  });
});

describe("computeCategoryDeviations", () => {
  it("computes deviation per CNC category", () => {
    const current = { "1_droits_artistiques": 0.1, "2_personnel": 0.4 };
    const reference = { "1_droits_artistiques": 0.08, "2_personnel": 0.5 };
    const result = computeCategoryDeviations(current, reference);
    expect(result["1_droits_artistiques"].deviation).toBeCloseTo(0.25);
    expect(result["2_personnel"].deviation).toBeCloseTo(-0.2);
    expect(result["2_personnel"].isOutlier).toBe(false);
  });

  it("flags outliers when deviation > 30%", () => {
    const current = { "1_droits_artistiques": 0.2 };
    const reference = { "1_droits_artistiques": 0.05 };
    const result = computeCategoryDeviations(current, reference);
    expect(result["1_droits_artistiques"].isOutlier).toBe(true);
  });
});

describe("computeRank", () => {
  it("finds the rank of a producer in a sorted list", () => {
    const ranking = [
      { producteur: "A", avgCoutMinute: 100, count: 5 },
      { producteur: "B", avgCoutMinute: 200, count: 3 },
      { producteur: "C", avgCoutMinute: 300, count: 2 },
    ];
    expect(computeRank(ranking, "B")).toBe(2);
  });
  it("returns -1 if producer not found", () => {
    expect(computeRank([], "X")).toBe(-1);
  });
});

describe("grilleToPctStructure", () => {
  it("converts absolute values to percentages", () => {
    const grille = {
      "1_droits_artistiques": { total: 1000 },
      "2_personnel": { total: 4000 },
    };
    const result = grilleToPctStructure(grille, 10000);
    expect(result["1_droits_artistiques"]).toBeCloseTo(0.1);
    expect(result["2_personnel"]).toBeCloseTo(0.4);
  });
  it("returns empty when totalDevis is 0", () => {
    expect(grilleToPctStructure({}, 0)).toEqual({});
  });
});
