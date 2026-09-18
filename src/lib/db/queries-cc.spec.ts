import { describe, expect, it, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb } from "./test-db";
import { getCcMinimums, getAllCcRatePeriods, insertCcRatePeriod } from "./queries-cc";

describe("queries-cc", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];

  beforeEach(async () => {
    ({ db } = await createTestDb());
  });

  describe("getCcMinimums", () => {
    it("returns fallback rates when table is empty", async () => {
      const rates = await getCcMinimums(undefined, db);
      expect(rates.cadreur_opv.minimum).toBe(281.54);
      expect(rates.directeur_de_production.minimum).toBe(383.39);
    });

    it("returns latest rates when no date specified", async () => {
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 258.97, '2017-08-01', NOW()::text)
      `);
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 281.54, '2025-07-01', NOW()::text)
      `);
      const rates = await getCcMinimums(undefined, db);
      expect(rates.cadreur.minimum).toBe(281.54);
    });

    it("returns rates effective at a given date", async () => {
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 258.97, '2017-08-01', NOW()::text)
      `);
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 278.76, '2024-02-01', NOW()::text)
      `);
      const rates = await getCcMinimums("2023-06-15", db);
      expect(rates.cadreur.minimum).toBe(258.97);
    });

    it("normalizes partial dates (YYYY and YYYY-MM)", async () => {
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 258.97, '2017-08-01', NOW()::text)
      `);
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 278.76, '2024-02-01', NOW()::text)
      `);
      const rates2023 = await getCcMinimums("2023", db);
      expect(rates2023.cadreur.minimum).toBe(258.97);
      const rates2024 = await getCcMinimums("2024-06", db);
      expect(rates2024.cadreur.minimum).toBe(278.76);
    });

    it("returns empty rates when date is before all effective_from dates", async () => {
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur', 'Cadreur / OPV', 281.54, '2025-07-01', NOW()::text)
      `);
      const rates = await getCcMinimums("2015-01-01", db);
      expect(Object.keys(rates)).toHaveLength(0);
    });

    it("uses cadreur_opv key (XLSM-derived from 'Cadreur / OPV (10)')", async () => {
      await db.execute(sql`
        INSERT INTO cc_minimums (role_key, label, minimum_daily, effective_from, created_at)
        VALUES ('cadreur_opv', 'Cadreur / OPV', 281.54, '2025-07-01', NOW()::text)
      `);
      const rates = await getCcMinimums(undefined, db);
      expect(rates.cadreur_opv.minimum).toBe(281.54);
      expect(rates.cadreur).toBeUndefined();
    });
  });

  describe("insertCcRatePeriod", () => {
    it("inserts a complete rate period", async () => {
      const rates = [
        { roleKey: "cadreur", label: "Cadreur / OPV", minimumDaily: 281.54, filiere: "C", niveau: "IIIA" },
      ];
      await insertCcRatePeriod("2025-07-01", rates, db);
      const result = await getCcMinimums("2025-08-01", db);
      expect(result.cadreur.minimum).toBe(281.54);
    });
  });
});
