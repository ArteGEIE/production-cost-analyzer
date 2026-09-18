import { getTableName, getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { productions } from "./schema";

describe("schema", () => {
  it("should define the productions table", () => {
    expect(getTableName(productions)).toBe("productions");
  });

  it("should have all required columns", () => {
    const columns = getTableColumns(productions);
    const columnNames = Object.keys(columns);

    expect(columnNames).toContain("totalDevis");
    expect(columnNames).toContain("coutMinute");
    expect(columnNames).toContain("confiance");
    expect(columnNames).toContain("diffuseur");
    expect(columnNames).toContain("lieuTournage");
    expect(columnNames).toContain("verificationMinima");
    expect(columnNames).toContain("anomalies");
    expect(columnNames).toContain("postesNonClasses");
    expect(columnNames).toContain("formatSource");
  });

  it("should use double precision type for monetary columns", () => {
    const columns = getTableColumns(productions);
    expect(columns.totalDevis.columnType).toBe("PgDoublePrecision");
    expect(columns.coutMinute.columnType).toBe("PgDoublePrecision");
  });
});
