import { describe, it, expect } from "vitest";
import { mapXlsxLabelToRoleKey } from "./seed-job-mapping";

describe("mapXlsxLabelToRoleKey", () => {
  it("maps DIR. PROD to directeur_de_production", () => {
    expect(mapXlsxLabelToRoleKey("DIR. PROD")).toBe("directeur_de_production");
  });
  it("maps CHARGE DE PROD to charge_de_production", () => {
    expect(mapXlsxLabelToRoleKey("CHARGE DE PROD")).toBe("charge_de_production");
  });
  it("maps CHEF OP to cadreur_opv", () => {
    expect(mapXlsxLabelToRoleKey("CHEF OP")).toBe("cadreur_opv");
  });
  it("maps INGE SON to chef_ops_ingenieur_du_son", () => {
    expect(mapXlsxLabelToRoleKey("INGE SON")).toBe("chef_ops_ingenieur_du_son");
  });
  it("maps MONTEUR / MONTEUR TRUQUISTE to chef_monteur", () => {
    expect(mapXlsxLabelToRoleKey("MONTEUR / MONTEUR TRUQUISTE")).toBe("chef_monteur");
  });
  it("maps ETALONNEUR to etalonneur", () => {
    expect(mapXlsxLabelToRoleKey("ETALONNEUR")).toBe("etalonneur");
  });
  it("maps CADREUR to cadreur_opv", () => {
    expect(mapXlsxLabelToRoleKey("CADREUR")).toBe("cadreur_opv");
  });
  it("maps REALISATEUR to realisateur", () => {
    expect(mapXlsxLabelToRoleKey("REALISATEUR")).toBe("realisateur");
  });
  it("maps TECHNICIEN VIDEO to technicien_video", () => {
    expect(mapXlsxLabelToRoleKey("TECHNICIEN VIDEO")).toBe("technicien_video");
  });
  it("maps ASSISTANT PROD to assistant_de_production", () => {
    expect(mapXlsxLabelToRoleKey("ASSISTANT PROD")).toBe("assistant_de_production");
  });
  it("maps PRODUCTEUR to producteur", () => {
    expect(mapXlsxLabelToRoleKey("PRODUCTEUR")).toBe("producteur");
  });
  it("maps JRI to jri", () => {
    expect(mapXlsxLabelToRoleKey("JRI")).toBe("jri");
  });
  it("maps STRINGER/FIXEUR to stringer_fixeur", () => {
    expect(mapXlsxLabelToRoleKey("STRINGER/FIXEUR")).toBe("stringer_fixeur");
  });
  it("returns null for unknown labels", () => {
    expect(mapXlsxLabelToRoleKey("UNKNOWN JOB")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(mapXlsxLabelToRoleKey("chef op")).toBe("cadreur_opv");
  });
});
