import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import { decideAuthProviders } from "./auth-config";

const decisions = decideAuthProviders(process.env);
const requiredGroup = process.env.AUTH_REQUIRED_GROUP;
const allowAnyOidcUser = process.env.AUTH_OIDC_ALLOW_ANY === "true";

const providers: Provider[] = [];

if (decisions.useOidc) {
  providers.push(
    Keycloak({
      // Any OIDC provider works — the Auth.js "Keycloak" wrapper is OIDC discovery.
      // Variable names use AUTH_OIDC_* to make this provider-agnostic.
      id: "oidc",
      name: process.env.AUTH_OIDC_NAME ?? "SSO",
      clientId: process.env.AUTH_OIDC_CLIENT_ID,
      clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET ?? "",
      issuer: process.env.AUTH_OIDC_ISSUER,
      authorization: { params: { scope: "openid profile email" } },
      checks: ["pkce"],
    }),
  );
}

if (decisions.useDemo) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      authorize: async () => ({
        id: "demo",
        name: "Utilisateur démo",
        email: "demo@example.com",
      }),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      if (!auth) return false;
      const session = auth as unknown as { provider?: string; groups?: string[] };
      if (session.provider === "demo") return decisions.useDemo;
      if (requiredGroup) {
        return (session.groups ?? []).includes(requiredGroup);
      }
      return allowAnyOidcUser;
    },
    async signIn({ profile, account }) {
      if (account?.provider === "demo") return decisions.useDemo;
      if (requiredGroup) {
        const groups = (profile?.groups as string[]) ?? [];
        return groups.includes(requiredGroup);
      }
      return allowAnyOidcUser;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
      }
      if (profile) {
        token.sub = (profile.sub as string) ?? token.sub;
        token.name = (profile.name as string) ?? (profile.preferred_username as string);
        token.email = profile.email as string;
        token.groups = (profile.groups as string[]) ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = (token.sub as string) ?? "";
      session.user.name = (token.name as string) ?? "";
      session.user.email = (token.email as string) ?? "";
      const extended = session as unknown as { provider?: string; groups: string[] };
      extended.provider = token.provider as string | undefined;
      extended.groups = (token.groups as string[]) ?? [];
      return session;
    },
  },
});

export const authProviders = decisions;
