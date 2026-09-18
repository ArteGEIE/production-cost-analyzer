import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/app-header";
import { AuthShell } from "@/components/auth-shell";
import { getAllProductions } from "@/lib/db/queries";
import { resolveBranding, themeStyle, toBrandingProps } from "@/lib/config/branding";
import "./globals.css";

export const dynamic = "force-dynamic";

// Optional deployment-provided script (feedback widget, analytics tag…): a
// gitignored public/custom.js added before the build and shipped like any other
// static asset. Nothing in the repository names a vendor. Checked once at
// startup — see docs/configuration.md.
const hasCustomScript = existsSync(join(process.cwd(), "public", "custom.js"));

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  const branding = resolveBranding();
  return {
    title: branding.name ?? t("title"),
    description: t("description"),
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const productions = await getAllProductions();
  const branding = resolveBranding();

  const searchRows = productions.map((p) => ({
    id: p.id,
    producteur: p.producteur,
    titre: p.titre,
  }));

  return (
    <html lang={locale} style={themeStyle(branding.theme) as React.CSSProperties}>
      <head>
        {branding.themeCssUrl && <link rel="stylesheet" href={branding.themeCssUrl} />}
        {hasCustomScript && <Script src="/custom.js" strategy="afterInteractive" />}
      </head>
      <body
        className={`${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <AuthShell
              authenticated={
                <div className="flex h-dvh flex-col">
                  <AppHeader productions={searchRows} branding={toBrandingProps(branding)} />
                  <div className="flex flex-1 flex-col overflow-auto">
                    {children}
                  </div>
                </div>
              }
            >
              {children}
            </AuthShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
