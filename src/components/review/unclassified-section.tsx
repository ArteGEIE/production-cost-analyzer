"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { cncGrid } from "@/lib/config/cnc-grid";
import type { PosteNonClasse, GrilleCnc } from "@/lib/schemas/devis";

interface UnclassifiedSectionProps {
  items: PosteNonClasse[];
  onClassify: (index: number, targetCategory: keyof GrilleCnc) => void;
}

function formatEuro(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function UnclassifiedRow({
  item,
  index,
  onClassify,
}: {
  item: PosteNonClasse;
  index: number;
  onClassify: (index: number, targetCategory: keyof GrilleCnc) => void;
}) {
  const t = useTranslations("review.unclassified");
  const tCncGrid = useTranslations("config.cncGrid");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    item.categorie_suggeree ?? "",
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <div className="flex-1 min-w-[200px]">
        <span className="font-medium text-sm">{item.poste}</span>
        {item.montant > 0 && (
          <span className="ml-2 text-sm font-mono text-muted-foreground">{formatEuro(item.montant)}</span>
        )}
        {item.categorie_suggeree && (
          <Badge variant="outline" className="ml-2 text-xs">
            {t("suggestion", {
              category: cncGrid.some((c) => c.key === item.categorie_suggeree)
                ? tCncGrid(item.categorie_suggeree)
                : item.categorie_suggeree,
            })}
          </Badge>
        )}
        <ConfidenceBadge confiance={item.confiance ?? undefined} compact />
      </div>

      <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? "")}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder={t("categoryPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {cncGrid.map((cat) => (
            <SelectItem key={cat.key} value={cat.key}>
              {cat.number}. {tCncGrid(cat.key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        disabled={!selectedCategory}
        onClick={() => onClassify(index, selectedCategory as keyof GrilleCnc)}
      >
        {t("classify")}
      </Button>
    </div>
  );
}

export function UnclassifiedSection({ items, onClassify }: UnclassifiedSectionProps) {
  const t = useTranslations("review.unclassified");
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("summary", { count: items.length })}
      </p>
      {items.map((item, i) => (
        <UnclassifiedRow key={`${item.poste}-${i}`} item={item} index={i} onClassify={onClassify} />
      ))}
    </div>
  );
}
