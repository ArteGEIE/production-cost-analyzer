import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearConfigOverrideCache, readConfigOverride } from "./config-dir";

describe("readConfigOverride", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pcost-config-"));
    clearConfigOverrideCache();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when APP_CONFIG_DIR is not set", () => {
    expect(readConfigOverride("production-types", {})).toBeNull();
  });

  it("returns null when the file is missing in the directory", () => {
    expect(readConfigOverride("production-types", { APP_CONFIG_DIR: dir })).toBeNull();
  });

  it("parses the override file when present", () => {
    writeFileSync(join(dir, "production-types.json"), JSON.stringify({ types: ["A", "B"] }));
    expect(readConfigOverride<{ types: string[] }>("production-types", { APP_CONFIG_DIR: dir })).toEqual({ types: ["A", "B"] });
  });

  it("fails loudly on invalid JSON", () => {
    writeFileSync(join(dir, "cnc-mapping.json"), "{ not json");
    expect(() => readConfigOverride("cnc-mapping", { APP_CONFIG_DIR: dir })).toThrow(/Invalid JSON/);
  });

  it("caches the first read", () => {
    writeFileSync(join(dir, "production-types.json"), JSON.stringify({ types: ["A"] }));
    readConfigOverride("production-types", { APP_CONFIG_DIR: dir });
    writeFileSync(join(dir, "production-types.json"), JSON.stringify({ types: ["B"] }));
    expect(readConfigOverride<{ types: string[] }>("production-types", { APP_CONFIG_DIR: dir })).toEqual({ types: ["A"] });
  });
});
