import { describe, expect, it, beforeEach } from "vitest";
import { createTestDb } from "./test-db";
import { getSetting, setSetting, getProductionTypes, getThresholdConfig, getCncMapping } from "./queries-settings";
import { DEFAULT_PRODUCTION_TYPES } from "@/lib/config/production-types";
import { DEFAULT_STRUCTURAL_THRESHOLDS, DEFAULT_R6_MIN_RATE, DEFAULT_R7_MAX_DEVIATION } from "@/lib/config/structural-thresholds";
import { DEFAULT_CNC_MAPPING } from "@/lib/config/cnc-mapping";

describe("queries-settings", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];

  beforeEach(async () => {
    ({ db } = await createTestDb());
  });

  describe("getSetting", () => {
    it("returns null for missing keys", async () => {
      const result = await getSetting("nonexistent", db);
      expect(result).toBeNull();
    });
  });

  describe("setSetting + getSetting roundtrip", () => {
    it("stores and retrieves a value", async () => {
      await setSetting("test_key", "test_value", db);
      const result = await getSetting("test_key", db);
      expect(result).toBe("test_value");
    });
  });

  describe("setSetting upsert", () => {
    it("updates an existing key", async () => {
      await setSetting("my_key", "first", db);
      await setSetting("my_key", "second", db);
      const result = await getSetting("my_key", db);
      expect(result).toBe("second");
    });
  });

  describe("getThresholdConfig", () => {
    it("returns defaults when no settings exist", async () => {
      const config = await getThresholdConfig(db);
      expect(config.structural).toEqual(DEFAULT_STRUCTURAL_THRESHOLDS);
      expect(config.r6MinRate).toBe(DEFAULT_R6_MIN_RATE);
      expect(config.r7MaxDeviation).toBe(DEFAULT_R7_MAX_DEVIATION);
    });

    it("returns stored values when set", async () => {
      await setSetting("r6_social_charges_min_rate", JSON.stringify(0.45), db);
      const config = await getThresholdConfig(db);
      expect(config.r6MinRate).toBe(0.45);
      expect(config.r7MaxDeviation).toBe(DEFAULT_R7_MAX_DEVIATION);
    });
  });

  describe("getProductionTypes", () => {
    it("returns defaults when no setting exists", async () => {
      const types = await getProductionTypes(db);
      expect(types).toEqual([...DEFAULT_PRODUCTION_TYPES]);
    });

    it("returns stored types when set", async () => {
      const custom = ["Type A", "Type B"];
      await setSetting("production_types", JSON.stringify(custom), db);
      const types = await getProductionTypes(db);
      expect(types).toEqual(custom);
    });
  });

  describe("getCncMapping", () => {
    it("returns defaults when no setting exists", async () => {
      const mapping = await getCncMapping(db);
      expect(mapping).toEqual([...DEFAULT_CNC_MAPPING]);
    });

    it("returns stored mapping when set", async () => {
      const custom = [{ role_key: "test", cnc_category: "2_personnel", labels: { fr: "Test", de: "Test", en: "Test" } }];
      await setSetting("cnc_mapping", JSON.stringify(custom), db);
      const mapping = await getCncMapping(db);
      expect(mapping).toEqual(custom);
    });
  });
});
