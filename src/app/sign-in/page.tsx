import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Film } from "lucide-react";
import { signIn, authProviders } from "@/lib/auth";
import { resolveBranding } from "@/lib/config/branding";

export default async function SignInPage() {
  const t = await getTranslations("signIn");
  const oidcLabel = process.env.AUTH_OIDC_NAME ?? "SSO";
  const branding = resolveBranding();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <div className="flex w-full max-w-sm flex-col items-center px-4">
        <div className="mb-8 flex flex-col items-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- runtime-configured URL, no build-time optimisation
            <img src={branding.logoUrl} alt="" className="h-10 w-auto" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Film className="size-6" aria-hidden="true" />
            </div>
          )}
          <span className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {branding.name ?? t("title")}
          </span>
        </div>

        <div className="w-full rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              {t("heading")}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {t("description")}
            </p>

            <div className="flex w-full flex-col gap-2">
              {authProviders.useOidc && (
                <form
                  action={async () => {
                    "use server";
                    await signIn("oidc", { redirectTo: "/" });
                  }}
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t("oidcButton", { provider: oidcLabel })}
                  </button>
                </form>
              )}

              {authProviders.useDemo && (
                <form
                  action={async () => {
                    "use server";
                    await signIn("demo", { redirect: false });
                    redirect("/");
                  }}
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t("demoButton")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
