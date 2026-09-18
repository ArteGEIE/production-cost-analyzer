import { describe, expect, it } from "vitest";
import { decideAuthProviders } from "./auth-config";

describe("decideAuthProviders", () => {
  it("activates OIDC when AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID, and AUTH_REQUIRED_GROUP are set", () => {
    const result = decideAuthProviders({
      AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
      AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
      AUTH_REQUIRED_GROUP: "broadcast-team",
    });
    expect(result.useOidc).toBe(true);
    expect(result.useDemo).toBe(false);
  });

  it("activates OIDC with AUTH_OIDC_ALLOW_ANY=true (no group restriction)", () => {
    const result = decideAuthProviders({
      AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
      AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
      AUTH_OIDC_ALLOW_ANY: "true",
    });
    expect(result.useOidc).toBe(true);
    expect(result.useDemo).toBe(false);
  });

  it("activates demo when DEMO_MODE is exactly 'true'", () => {
    const result = decideAuthProviders({ DEMO_MODE: "true" });
    expect(result.useOidc).toBe(false);
    expect(result.useDemo).toBe(true);
  });

  it("activates both when both are configured", () => {
    const result = decideAuthProviders({
      AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
      AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
      AUTH_REQUIRED_GROUP: "broadcast-team",
      DEMO_MODE: "true",
    });
    expect(result.useOidc).toBe(true);
    expect(result.useDemo).toBe(true);
  });

  it("throws when no provider is configured", () => {
    expect(() => decideAuthProviders({})).toThrow(/no auth provider/i);
  });

  it("throws with a helpful message naming the env vars to set", () => {
    expect(() => decideAuthProviders({})).toThrow(/AUTH_OIDC_ISSUER/);
    expect(() => decideAuthProviders({})).toThrow(/DEMO_MODE/);
  });

  it("does not activate demo when DEMO_MODE is 'false'", () => {
    expect(() =>
      decideAuthProviders({ DEMO_MODE: "false" }),
    ).toThrow(/no auth provider/i);
  });

  it("does not activate demo when DEMO_MODE is empty string", () => {
    expect(() =>
      decideAuthProviders({ DEMO_MODE: "" }),
    ).toThrow(/no auth provider/i);
  });

  it("does not activate demo when DEMO_MODE is '1'", () => {
    // Strict matching: only the literal string "true" enables demo
    expect(() =>
      decideAuthProviders({ DEMO_MODE: "1" }),
    ).toThrow(/no auth provider/i);
  });

  it("requires both AUTH_OIDC_ISSUER and AUTH_OIDC_CLIENT_ID for OIDC", () => {
    expect(() =>
      decideAuthProviders({ AUTH_OIDC_ISSUER: "https://example.com" }),
    ).toThrow(/no auth provider/i);
    expect(() =>
      decideAuthProviders({ AUTH_OIDC_CLIENT_ID: "client-id" }),
    ).toThrow(/no auth provider/i);
  });

  // Fail-closed: OIDC without restriction must be an explicit choice.
  it("throws when OIDC is configured without AUTH_REQUIRED_GROUP or AUTH_OIDC_ALLOW_ANY", () => {
    expect(() =>
      decideAuthProviders({
        AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
        AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
      }),
    ).toThrow(/no access restriction/i);
  });

  it("throws with a helpful message naming both ways to fix the OIDC restriction error", () => {
    const oidcEnv = {
      AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
      AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
    };
    expect(() => decideAuthProviders(oidcEnv)).toThrow(/AUTH_REQUIRED_GROUP/);
    expect(() => decideAuthProviders(oidcEnv)).toThrow(/AUTH_OIDC_ALLOW_ANY/);
  });

  it("does not activate AUTH_OIDC_ALLOW_ANY when value is not exactly 'true'", () => {
    expect(() =>
      decideAuthProviders({
        AUTH_OIDC_ISSUER: "https://keycloak.example.com/realms/foo",
        AUTH_OIDC_CLIENT_ID: "production-cost-analyzer",
        AUTH_OIDC_ALLOW_ANY: "1",
      }),
    ).toThrow(/no access restriction/i);
  });

  it("does not require group check for demo-only configurations", () => {
    // Demo provider is exempt from the OIDC group requirement
    const result = decideAuthProviders({ DEMO_MODE: "true" });
    expect(result.useDemo).toBe(true);
  });
});
