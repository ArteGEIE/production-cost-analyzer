export interface AuthProviderDecisions {
  useOidc: boolean;
  useDemo: boolean;
}

/**
 * Decide which auth providers to enable based on env vars.
 * Throws when no provider is configured — the app must not start with no auth.
 * Also throws when OIDC is enabled without a group restriction unless
 * AUTH_OIDC_ALLOW_ANY=true is set explicitly (fail-closed by default).
 */
export function decideAuthProviders(
  env: Record<string, string | undefined>,
): AuthProviderDecisions {
  const useOidc = Boolean(env.AUTH_OIDC_ISSUER && env.AUTH_OIDC_CLIENT_ID);
  const useDemo = env.DEMO_MODE === "true";

  if (!useOidc && !useDemo) {
    throw new Error(
      "No auth provider configured. Set AUTH_OIDC_ISSUER + AUTH_OIDC_CLIENT_ID (production) " +
        "or DEMO_MODE=true (evaluation/demo) in your environment.",
    );
  }

  if (useOidc) {
    const hasGroupCheck = Boolean(env.AUTH_REQUIRED_GROUP);
    const allowAny = env.AUTH_OIDC_ALLOW_ANY === "true";
    if (!hasGroupCheck && !allowAny) {
      throw new Error(
        "OIDC is configured but no access restriction is set. " +
          "Set AUTH_REQUIRED_GROUP=<group> to restrict access to a specific group claim, " +
          "or AUTH_OIDC_ALLOW_ANY=true to explicitly allow any authenticated user.",
      );
    }
  }

  return { useOidc, useDemo };
}
