import { describe, expect, it, vi } from "vitest";

// proxy.ts imports `auth` from "@/lib/auth", which pulls in next-auth and,
// transitively, "next/server" — a module Next's own build resolves but the
// plain Vite resolver under Vitest cannot. Mocking it here sidesteps that
// unrelated resolution failure while still importing the real `config` export
// from the real module, so editing the matcher in proxy.ts still breaks this test.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { config } from "./proxy";

// Next.js anchors matcher patterns against the full pathname. The raw pattern
// string is not anchored on its own — without ^/$ a path like "/api/health"
// would spuriously match via the embedded "/" before "health", masking the
// exclusion. Anchoring here reproduces Next's actual matching behavior.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it("excludes /api/health from the auth proxy", () => {
    expect(matcher.test("/api/health")).toBe(false);
  });

  it("excludes /api/health/ready from the auth proxy", () => {
    expect(matcher.test("/api/health/ready")).toBe(false);
  });

  it("still gates /productions behind auth", () => {
    expect(matcher.test("/productions")).toBe(true);
  });

  it("still gates / behind auth", () => {
    expect(matcher.test("/")).toBe(true);
  });
});
