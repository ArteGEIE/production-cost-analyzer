"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, BarChart3, FileText, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { BrandingProps } from "@/lib/config/branding";

interface AppHeaderProps {
  productions: { id: number; producteur: string; titre: string }[];
  branding?: BrandingProps;
}

export function AppHeader({ productions, branding }: AppHeaderProps) {
  const t = useTranslations("appHeader");
  const tNav = useTranslations("nav");
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? productions
        .filter((p) => {
          const q = query.toLowerCase();
          return (
            p.titre?.toLowerCase().includes(q) ||
            p.producteur?.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  const handleSelect = useCallback(
    (id: number) => {
      setQuery("");
      setShowResults(false);
      router.push(`/productions/${id}/compliance`);
    },
    [router],
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold shrink-0">
        {branding?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- runtime-configured URL, no build-time optimisation
          <img src={branding.logoUrl} alt="" className="h-6 w-auto" />
        )}
        {branding?.name ?? tNav("title")}
        {branding?.badge && (
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-primary-foreground">
            {branding.badge}
          </span>
        )}
      </Link>

      <nav className="flex items-center gap-1">
        <Link
          href="/productions"
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md",
            pathname.startsWith("/productions")
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="size-4" />
          {tNav("productions")}
        </Link>
        <Link
          href="/analytics"
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md",
            pathname.startsWith("/analytics")
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BarChart3 className="size-4" />
          {tNav("analytics")}
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md",
            pathname.startsWith("/settings")
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="size-4" />
          {tNav("settings")}
        </Link>
        <Link
          href="/guide"
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md",
            pathname.startsWith("/guide")
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="size-4" />
          {tNav("guide")}
        </Link>
      </nav>

      <div className="flex-1" />

      {/* Global search */}
      <div ref={containerRef} className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={tNav("searchPlaceholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => query.trim() && setShowResults(true)}
          className="h-8 pl-8 text-sm"
        />
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.titre}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.producteur}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {showResults && query.trim() && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-3 shadow-lg">
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          </div>
        )}
      </div>

      <Link
        href="/productions/import"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Plus className="size-3.5" />
        {tNav("importButton")}
      </Link>
      <LanguageSwitcher />
      <UserMenu />
    </header>
  );
}
