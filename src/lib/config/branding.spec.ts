import { describe, expect, it } from "vitest";
import { cssColor, DEFAULT_THEME, resolveBranding, themeStyle, toBrandingProps } from "./branding";

describe("resolveBranding", () => {
  it("returns neutral defaults when nothing is configured", () => {
    const b = resolveBranding({});
    expect(b.name).toBeNull();
    expect(b.badge).toBeNull();
    expect(b.logoUrl).toBeNull();
    expect(b.themeCssUrl).toBeNull();
    expect(b.theme).toEqual(DEFAULT_THEME);
  });

  it("reads name, badge and logo", () => {
    const b = resolveBranding({ APP_NAME: "  Budget Check ", APP_BADGE: "Beta", APP_LOGO_URL: "/logo.svg" });
    expect(b.name).toBe("Budget Check");
    expect(b.badge).toBe("Beta");
    expect(b.logoUrl).toBe("/logo.svg");
  });

  it("treats blank strings as unset", () => {
    const b = resolveBranding({ APP_NAME: "   ", APP_BADGE: "" });
    expect(b.name).toBeNull();
    expect(b.badge).toBeNull();
  });

  it("accepts http(s) and root-relative URLs only", () => {
    expect(resolveBranding({ APP_LOGO_URL: "https://cdn.example.com/logo.png" }).logoUrl).toBe("https://cdn.example.com/logo.png");
    expect(resolveBranding({ APP_LOGO_URL: "//cdn.example.com/logo.png" }).logoUrl).toBe("//cdn.example.com/logo.png");
    expect(resolveBranding({ APP_LOGO_URL: "javascript:alert(1)" }).logoUrl).toBeNull();
    expect(resolveBranding({ APP_LOGO_URL: "data:image/svg+xml,..." }).logoUrl).toBeNull();
    expect(resolveBranding({ APP_THEME_CSS_URL: "logo.png" }).themeCssUrl).toBeNull();
  });

  it("clamps hue and chroma to their valid ranges, falling back to defaults", () => {
    expect(resolveBranding({ APP_THEME_HUE: "210" }).theme.hue).toBe(210);
    expect(resolveBranding({ APP_THEME_HUE: "400" }).theme.hue).toBe(DEFAULT_THEME.hue);
    expect(resolveBranding({ APP_THEME_HUE: "blue" }).theme.hue).toBe(DEFAULT_THEME.hue);
    expect(resolveBranding({ APP_THEME_CHROMA: "0.1" }).theme.chroma).toBe(0.1);
    expect(resolveBranding({ APP_THEME_CHROMA: "2" }).theme.chroma).toBe(DEFAULT_THEME.chroma);
  });

});

describe("cssColor", () => {
  it("accepts hex, named and functional colours", () => {
    expect(cssColor("#fa481c")).toBe("#fa481c");
    expect(cssColor("rebeccapurple")).toBe("rebeccapurple");
    expect(cssColor("oklch(0.6 0.2 250)")).toBe("oklch(0.6 0.2 250)");
    expect(cssColor("hsl(210, 80%, 50%)")).toBe("hsl(210, 80%, 50%)");
  });

  it("rejects anything that could escape a style declaration", () => {
    expect(cssColor("red; background: url(evil)")).toBeNull();
    expect(cssColor("url(x)")).toBeNull();
    expect(cssColor("#fa481c}")).toBeNull();
    expect(cssColor(undefined)).toBeNull();
  });
});

describe("themeStyle", () => {
  it("emits hue and chroma variables by default", () => {
    expect(themeStyle(DEFAULT_THEME)).toEqual({ "--brand-hue": "28.5", "--brand-chroma": "0.222" });
  });

  it("adds primary overrides only when set", () => {
    const style = themeStyle({ ...DEFAULT_THEME, primary: "#0055ff", primaryForeground: "white" });
    expect(style["--primary"]).toBe("#0055ff");
    expect(style["--primary-foreground"]).toBe("white");
  });
});

describe("toBrandingProps", () => {
  it("exposes only the client-safe subset", () => {
    const props = toBrandingProps(resolveBranding({ APP_NAME: "X", APP_THEME_CSS_URL: "/theme.css" }));
    expect(props).toEqual({ name: "X", badge: null, logoUrl: null });
  });
});
