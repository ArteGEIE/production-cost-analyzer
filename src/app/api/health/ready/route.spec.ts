import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("@/lib/db", () => ({ db: { execute: (...args: unknown[]) => execute(...args) } }));

const logError = vi.fn();
vi.mock("@/lib/logger", () => ({ log: { error: (...args: unknown[]) => logError(...args) } }));

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    execute.mockReset();
    logError.mockReset();
  });

  it("returns 200 with a ready status when the database answers", async () => {
    execute.mockResolvedValueOnce([{ ok: 1 }]);
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ready" });
  });

  it("returns 503 with an unavailable status when the database throws", async () => {
    execute.mockRejectedValueOnce(new Error("connection refused"));
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ status: "unavailable" });
    expect(logError).toHaveBeenCalled();
  });
});
