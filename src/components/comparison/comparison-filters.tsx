"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComparisonFiltersProps {
  /** Distinct producers available for comparison (excluding the current production's producer). */
  producteurs: string[];
  /** Distinct production durations (minutes) available in the dataset. */
  durees: number[];
  /** Producer of the current production — pinned in the peer set and not removable. */
  currentProducteur: string;
  /** Currently selected peer producers (excludes currentProducteur). */
  selectedProducteurs: string[];
  /** Currently selected duration (minutes), or null when no format filter. */
  selectedDuree: number | null;
}

export function ComparisonFilters({
  producteurs,
  durees,
  currentProducteur,
  selectedProducteurs,
  selectedDuree,
}: ComparisonFiltersProps) {
  const t = useTranslations("comparison.comparisonFilters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [producersOpen, setProducersOpen] = useState(false);

  const peerOptions = useMemo(
    () => producteurs.filter((p) => p !== currentProducteur),
    [producteurs, currentProducteur],
  );

  function navigate(next: { producteurs?: string[]; duree?: number | null }) {
    const params = new URLSearchParams(searchParams.toString());

    const newProducteurs =
      next.producteurs !== undefined ? next.producteurs : selectedProducteurs;
    if (newProducteurs.length > 0) params.set("producteurs", newProducteurs.join(","));
    else params.delete("producteurs");

    const newDuree = next.duree !== undefined ? next.duree : selectedDuree;
    if (newDuree != null) params.set("duree", String(newDuree));
    else params.delete("duree");

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleProducteur(p: string) {
    const next = selectedProducteurs.includes(p)
      ? selectedProducteurs.filter((x) => x !== p)
      : [...selectedProducteurs, p];
    navigate({ producteurs: next });
  }

  const hasFilter = selectedProducteurs.length > 0 || selectedDuree != null;

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Filter className="size-4 text-muted-foreground" />
          <span>{t("compareWith")}</span>
        </div>

        {/* Multi-select producers */}
        <Popover open={producersOpen} onOpenChange={setProducersOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="min-w-44 justify-between gap-1.5">
                <span className="truncate text-left">
                  {selectedProducteurs.length === 0
                    ? t("allProducers")
                    : t("selectedProducers", { count: selectedProducteurs.length })}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            }
          />
          <PopoverPopup className="max-h-80 w-72 overflow-y-auto p-1">
            {peerOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">{t("noOtherProducers")}</p>
            ) : (
              <>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  onClick={() => navigate({ producteurs: [] })}
                  disabled={selectedProducteurs.length === 0}
                >
                  <span>{t("deselectAll")}</span>
                </button>
                <div className="my-1 h-px bg-border" />
                {peerOptions.map((p) => {
                  const checked = selectedProducteurs.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                        checked && "font-medium",
                      )}
                      onClick={() => toggleProducteur(p)}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="truncate">{p}</span>
                    </button>
                  );
                })}
              </>
            )}
          </PopoverPopup>
        </Popover>

        {/* Format filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t("format")}</span>
          <select
            value={selectedDuree ?? ""}
            onChange={(e) => navigate({ duree: e.target.value === "" ? null : Number(e.target.value) })}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">{t("allFormats")}</option>
            {durees.map((d) => (
              <option key={d} value={d}>
                {d}&apos;
              </option>
            ))}
          </select>
        </div>

        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => navigate({ producteurs: [], duree: null })}
          >
            <X className="size-3.5" />
            {t("reset")}
          </Button>
        )}
      </div>

      {selectedProducteurs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedProducteurs.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-border"
            >
              {p}
              <button
                type="button"
                onClick={() => toggleProducteur(p)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("removeProducer", { producer: p })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
