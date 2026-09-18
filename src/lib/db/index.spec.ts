import { beforeEach, describe, expect, it, vi } from "vitest";

const postgresSpy = vi.fn((..._args: unknown[]) => ({}));
vi.mock("postgres", () => ({ default: (...args: unknown[]) => postgresSpy(...args) }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: (client: unknown) => ({ client }) }));

describe("getDb", () => {
  beforeEach(() => {
    postgresSpy.mockClear();
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:5432/db";
  });

  it("caps the pool and closes idle connections", async () => {
    const { getDb } = await import("./index");
    getDb();
    expect(postgresSpy).toHaveBeenCalledWith(
      "postgres://u:p@127.0.0.1:5432/db",
      expect.objectContaining({ max: 5, idle_timeout: 30 }),
    );
  });

  it("throws a clear error when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { getDb } = await import("./index");
    expect(() => getDb()).toThrow("DATABASE_URL is not set");
  });
});
