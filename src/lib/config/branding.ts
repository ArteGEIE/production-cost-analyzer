/**
 * Branding and theme, resolved from environment variables at request time so a
 * single Docker image serves any organisation. Pure: pass an env record to test.
 *
 * | Variable                     | Effect                                                     |
 * |------------------------------|------------------------------------------------------------|
 * | APP_NAME                     | Product name in the header, sign-in page and <title>       |
 * | APP_BADGE                    | Small badge next to the name (e.g. "Beta"); empty = hidden |
 * | APP_LOGO_URL                 | Logo image (absolute URL or path under public/)            |
 * | APP_FAVICON_URL              | Favicon override                                           |
 * | APP_THEME_HUE                | oklch hue (0–360) driving primary and all tinted tokens    |
 * | APP_THEME_CHROMA             | oklch chroma (0–0.4) of the primary colour                 |
 * | APP_PRIMARY_COLOR            | Explicit primary colour (any CSS colour), overrides hue    |
 * | APP_PRIMARY_FOREGROUND_COLOR | Text colour on primary surfaces                            |
 * | APP_THEME_CSS_URL            | Extra stylesheet loaded after the built-in theme           |
 *
 * Third-party scripts (feedback widget, analytics, chat) are not env vars: they
 * ship as a gitignored public/custom.js bundled at build time, see src/app/layout.tsx.
 */

export interface BrandingTheme {
  hue: number;
  chroma: number;
  primary: string | null;
  primaryForeground: string | null;
}

export interface Branding {
  name: string | null;
  badge: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  themeCssUrl: string | null;
  theme: BrandingTheme;
}

export const DEFAULT_THEME: BrandingTheme = {
  hue: 28.5,
  chroma: 0.222,
  primary: null,
  primaryForeground: null,
};

type Env = Record<string, string | undefined>;

function text(value: string | undefined, maxLength = 200): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/** Accepts http(s) URLs, protocol-relative and root-relative paths. Rejects javascript:, data: etc. */
function url(value: string | undefined): string | null {
  const v = text(value, 2000);
  if (!v) return null;
  if (/^(https?:)?\/\//i.test(v) || /^\/[^/]/.test(v)) return v;
  return null;
}

function number(value: string | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/**
 * A CSS colour restricted to a conservative grammar — hex, named colours or a
 * functional notation with numeric arguments — so the value can be emitted into
 * an inline style attribute without opening a CSS-injection hole.
 */
const CSS_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,30}|(?:oklch|oklab|hsl|hsla|rgb|rgba|lch|lab|color)\([0-9a-z.%,\s/+-]{1,80}\))$/i;

export function cssColor(value: string | undefined): string | null {
  const v = text(value, 100);
  return v && CSS_COLOR.test(v) ? v : null;
}

export function resolveBranding(env: Env = process.env): Branding {
  return {
    name: text(env.APP_NAME, 80),
    badge: text(env.APP_BADGE, 20),
    logoUrl: url(env.APP_LOGO_URL),
    faviconUrl: url(env.APP_FAVICON_URL),
    themeCssUrl: url(env.APP_THEME_CSS_URL),
    theme: {
      hue: number(env.APP_THEME_HUE, 0, 360, DEFAULT_THEME.hue),
      chroma: number(env.APP_THEME_CHROMA, 0, 0.4, DEFAULT_THEME.chroma),
      primary: cssColor(env.APP_PRIMARY_COLOR),
      primaryForeground: cssColor(env.APP_PRIMARY_FOREGROUND_COLOR),
    },
  };
}

/**
 * CSS custom properties to set on <html>. Inline styles win over the :root and
 * .dark rules in globals.css, so an explicit primary colour applies to both
 * colour schemes while hue/chroma keep the light/dark derivation intact.
 */
export function themeStyle(theme: BrandingTheme): Record<string, string> {
  const style: Record<string, string> = {
    "--brand-hue": String(theme.hue),
    "--brand-chroma": String(theme.chroma),
  };
  if (theme.primary) style["--primary"] = theme.primary;
  if (theme.primaryForeground) style["--primary-foreground"] = theme.primaryForeground;
  return style;
}

/** Client-safe subset passed from the root layout to client components. */
export interface BrandingProps {
  name: string | null;
  badge: string | null;
  logoUrl: string | null;
}

export function toBrandingProps(branding: Branding): BrandingProps {
  return { name: branding.name, badge: branding.badge, logoUrl: branding.logoUrl };
}
