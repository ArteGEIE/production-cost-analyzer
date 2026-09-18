"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productionTypes } from "@/lib/config/production-types";
import { fetchExistingProducers } from "@/app/review/actions";
import type { Meta } from "@/lib/schemas/devis";

interface MetadataFormProps {
  value: Meta;
  onChange: (meta: Partial<Meta>) => void;
}

const isKnownType = (t: string): boolean => productionTypes.includes(t);

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  const t = useTranslations("review.metadata.form");
  const [existingProducers, setExistingProducers] = useState<string[]>([]);

  useEffect(() => {
    fetchExistingProducers().then(setExistingProducers);
  }, []);

  // Track "Autre" mode separately so the free-text input stays mounted
  const [isCustomType, setIsCustomType] = useState(!isKnownType(value.type_production));
  const [customText, setCustomText] = useState(
    isKnownType(value.type_production) ? "" : value.type_production,
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="producteur">{t("producteur")}</Label>
        <Input
          id="producteur"
          list="existing-producers"
          value={value.producteur}
          onChange={(e) => onChange({ producteur: e.target.value })}
        />
        {existingProducers.length > 0 && (
          <datalist id="existing-producers">
            {existingProducers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titre">{t("titre")}</Label>
        <Input
          id="titre"
          value={value.titre}
          onChange={(e) => onChange({ titre: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="duree">{t("duree")}</Label>
        <Input
          id="duree"
          type="number"
          min={1}
          value={value.duree_minutes}
          onChange={(e) => onChange({ duree_minutes: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="diffuseur">{t("diffuseur")}</Label>
        <Input
          id="diffuseur"
          value={value.diffuseur ?? ""}
          onChange={(e) => onChange({ diffuseur: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lieu_tournage">{t("lieuTournage")}</Label>
        <Input
          id="lieu_tournage"
          value={value.lieu_tournage ?? ""}
          onChange={(e) => onChange({ lieu_tournage: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date_devis">{t("dateDevis")}</Label>
        <Input
          id="date_devis"
          type="date"
          value={value.date_devis ?? ""}
          onChange={(e) => onChange({ date_devis: e.target.value || undefined })}
        />
      </div>

      <div className="flex items-center gap-2 self-end pb-1">
        <input
          id="cnc_funding"
          type="checkbox"
          checked={value.cnc_funding ?? false}
          onChange={(e) => onChange({ cnc_funding: e.target.checked })}
          className="size-4 rounded border-input accent-blue-600"
        />
        <Label htmlFor="cnc_funding" className="cursor-pointer">{t("cncFunding")}</Label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type_production">{t("typeProduction")}</Label>
        <Select
          value={isCustomType ? "Autre" : value.type_production}
          onValueChange={(v) => {
            if (v == null) return;
            if (v === "Autre") {
              setIsCustomType(true);
              setCustomText("");
              onChange({ type_production: "Autre" });
            } else {
              setIsCustomType(false);
              onChange({ type_production: v });
            }
          }}
        >
          <SelectTrigger id="type_production">
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {productionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isCustomType && (
          <Input
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              onChange({ type_production: e.target.value || "Autre" });
            }}
            placeholder={t("customTypePlaceholder")}
            className="mt-1.5"
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
