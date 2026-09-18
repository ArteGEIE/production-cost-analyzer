"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, X, Save, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CncGridEditor } from "@/components/review/cnc-grid-editor";
import { MetadataForm } from "@/components/review/metadata-form";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { InfoTip } from "@/components/ui/info-tip";
import { cncGrid } from "@/lib/config/cnc-grid";
import type { CcRates } from "@/lib/config/cc-minimums";
import { calculateCategoryTotal } from "@/lib/calculations/totals";
import { useReviewForm, type UseReviewFormReturn } from "@/hooks/use-review-form";
import { updateProductionAction, deleteProductionAction } from "./actions";
import type { DevisExtraction, GrilleCnc, Ligne, PersonnelLine } from "@/lib/schemas/devis";
import type { ThresholdConfig } from "@/lib/db/queries-settings";

interface DevisViewProps {
  extraction: DevisExtraction;
  productionId: number;
  thresholds: ThresholdConfig;
  ccRates: CcRates;
}

function formatEuro(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(amount: number, total: number): string {
  if (!total) return "—";
  return `${((amount / total) * 100).toFixed(1)} %`;
}

/** Read-only lignes table for non-personnel categories */
function ReadOnlyLignesTable({ lignes }: { lignes: Ligne[] }) {
  const t = useTranslations("devis");
  if (lignes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noLines")}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.poste")}</TableHead>
          <TableHead className="w-32 text-right">{t("table.montant")}</TableHead>
          <TableHead className="w-24">
              <span className="inline-flex items-center gap-1">
                {t("table.confiance")}
                <InfoTip>{t("confidenceTip")}</InfoTip>
              </span>
            </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((ligne, i) => (
          <TableRow key={i}>
            <TableCell className="text-sm">{ligne.poste}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatEuro(ligne.montant)}</TableCell>
            <TableCell>
              <ConfidenceBadge confiance={ligne.confiance ?? undefined} compact />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium">{t("subtotal")}</TableCell>
          <TableCell className="text-right font-mono font-medium">
            {formatEuro(lignes.reduce((sum, l) => sum + l.montant, 0))}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Read-only personnel table */
function ReadOnlyPersonnelTable({ postes, ccRates }: { postes: PersonnelLine[]; ccRates: CcRates }) {
  const t = useTranslations("devis");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.poste")}</TableHead>
          <TableHead className="w-20 text-right">{t("table.jours")}</TableHead>
          <TableHead className="w-28 text-right">{t("table.tarifJour")}</TableHead>
          <TableHead className="w-28 text-right">{t("table.total")}</TableHead>
          <TableHead className="w-24">
              <span className="inline-flex items-center gap-1">
                {t("table.confiance")}
                <InfoTip>{t("confidenceTip")}</InfoTip>
              </span>
            </TableHead>
          <TableHead className="w-32">{t("table.cc")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {postes.map((line, i) => {
          const ccAlert =
            line.role_key in ccRates &&
            line.tarif_journalier < ccRates[line.role_key].minimum;
          return (
            <TableRow key={i}>
              <TableCell className="text-sm">{line.poste}</TableCell>
              <TableCell className="text-right font-mono text-sm">{line.nombre_jours}</TableCell>
              <TableCell className={`text-right font-mono text-sm ${ccAlert ? "text-red-600" : ""}`}>
                {formatEuro(line.tarif_journalier)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{formatEuro(line.total)}</TableCell>
              <TableCell>
                <ConfidenceBadge confiance={line.confiance ?? "inconnue"} compact />
              </TableCell>
              <TableCell>
                {ccAlert && (
                  <span className="text-xs text-red-600">
                    {t("ccMinimum", { minimum: ccRates[line.role_key].minimum })}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-medium">{t("subtotalPersonnel")}</TableCell>
          <TableCell className="text-right font-mono font-medium">
            {formatEuro(postes.reduce((sum, p) => sum + p.total, 0))}
          </TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Read-only CNC grid accordion */
function ReadOnlyGrid({ grilleCnc, totalDevis, ccRates }: { grilleCnc: GrilleCnc; totalDevis: number; ccRates: CcRates }) {
  const t = useTranslations("devis");
  const tCncGrid = useTranslations("config.cncGrid");
  return (
    <Accordion multiple className="w-full">
      {cncGrid.map((cat) => {
        const value = grilleCnc?.[cat.key as keyof GrilleCnc];
        if (!value) return null;
        const catTotal = calculateCategoryTotal(value as { total: number });
        const isPersonnel = cat.key === "2_personnel";

        return (
          <AccordionItem key={cat.key} value={cat.key}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full items-center gap-3 pr-2">
                <span className="w-6 text-sm font-medium text-muted-foreground">{cat.number}</span>
                <span className="flex-1 text-left text-sm inline-flex items-center gap-1">
                  {tCncGrid(cat.key)}
                  {cat.key === "10_imprevus_fg_pd" && (
                    <InfoTip>{t("imprevusTip")}</InfoTip>
                  )}
                </span>
                <span className="font-mono text-sm font-medium tabular-nums">{formatEuro(catTotal)}</span>
                <span className="w-14 text-right font-mono text-xs text-muted-foreground tabular-nums" title={t("shareOfTotal")}>
                  {formatPercent(catTotal, totalDevis)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-2 py-3">
                {isPersonnel ? (
                  <ReadOnlyPersonnelTable postes={(value as GrilleCnc["2_personnel"]).postes ?? []} ccRates={ccRates} />
                ) : (
                  <ReadOnlyLignesTable lignes={(value as { lignes: Ligne[] }).lignes ?? []} />
                )}
                {cat.key === "4_charges_sociales" && (
                  <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                    {t("avgRate", {
                      value:
                        (value as GrilleCnc["4_charges_sociales"]).taux_moyen != null
                          ? `${((value as GrilleCnc["4_charges_sociales"]).taux_moyen! * 100).toFixed(0)} %`
                          : "—",
                    })}
                    <InfoTip>{t("chargesSocialesTip")}</InfoTip>
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/** Metadata summary bar */
function MetadataSummary({ extraction }: { extraction: DevisExtraction }) {
  const t = useTranslations("devis.metadata");
  const { meta } = extraction;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      <div>
        <span className="text-muted-foreground">{t("producteur")}</span>
        <p className="font-medium">{meta.producteur}</p>
      </div>
      <div>
        <span className="text-muted-foreground">{t("type")}</span>
        <p className="font-medium">{meta.type_production}</p>
      </div>
      <div>
        <span className="text-muted-foreground">{t("duree")}</span>
        <p className="font-medium">{t("dureeValue", { minutes: meta.duree_minutes })}</p>
      </div>
      {meta.diffuseur && (
        <div>
          <span className="text-muted-foreground">{t("diffuseur")}</span>
          <p className="font-medium">{meta.diffuseur}</p>
        </div>
      )}
      {meta.lieu_tournage && (
        <div>
          <span className="text-muted-foreground">{t("lieuTournage")}</span>
          <p className="font-medium">{meta.lieu_tournage}</p>
        </div>
      )}
    </div>
  );
}

/** Edit mode content (no footer — footer is in parent) */
function EditContent({ form, ccRates, extraction }: { form: UseReviewFormReturn; ccRates: CcRates; extraction: DevisExtraction }) {
  return (
    <div className="space-y-6">
      <MetadataForm value={form.meta} onChange={form.updateMeta} />
      <CncGridEditor
        grilleCnc={form.grilleCnc}
        totalDevis={form.totalDevis}
        extractedTotal={extraction.total_devis}
        classifiedItems={form.classifiedItems}
        ccRates={ccRates}
        onUpdateGrille={form.updateGrilleCnc}
        onUpdatePersonnelLine={form.updatePersonnelLine}
        onAddLine={form.addLine}
        onDeleteLine={form.deleteLine}
        onUpdateClassifiedLine={form.updateClassifiedLine}
        onRemoveClassifiedLine={form.removeClassifiedLine}
        onMoveLine={form.moveLine}
      />
    </div>
  );
}

/** Read-only content */
function ReadContent({ extraction, ccRates }: { extraction: DevisExtraction; ccRates: CcRates }) {
  const t = useTranslations("devis");
  return (
    <div className="space-y-6">
      <MetadataSummary extraction={extraction} />

      <h2 className="text-lg font-semibold inline-flex items-center gap-1.5">
        {t("grid.title")}
        <InfoTip>{t("grid.titleTip")}</InfoTip>
      </h2>
      <ReadOnlyGrid grilleCnc={extraction.grille_cnc} totalDevis={extraction.total_devis} ccRates={ccRates} />
      <div className="space-y-1 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("totalDevisLabel")}</span>
          <span className="text-lg font-bold font-mono tabular-nums">
            {formatEuro(extraction.total_devis)}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs">{t("coutMinuteLabel")}</span>
          <span className="text-sm font-mono tabular-nums">
            {formatEuro(extraction.cout_minute)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DevisView({ extraction, productionId, thresholds, ccRates }: DevisViewProps) {
  const t = useTranslations("devis");
  const tErrors = useTranslations("devis.errors");
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const form = useReviewForm(extraction, ccRates, thresholds);

  function handleSave() {
    const data = form.toDevisExtraction();
    setError(null);
    startSaveTransition(async () => {
      try {
        const result = await updateProductionAction(productionId, data);
        if ("error" in result) {
          setError(tErrors(result.error));
        } else {
          setEditing(false);
          router.refresh();
        }
      } catch (err) {
        console.error("Unexpected error while saving production devis:", err);
        setError(tErrors("unexpectedError"));
      }
    });
  }

  function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    startDeleteTransition(async () => {
      const result = await deleteProductionAction(productionId);
      if ("error" in result) {
        alert(tErrors(result.error));
      } else {
        router.push("/productions");
      }
    });
  }

  const pageContent = (
    <div className="space-y-6">
      {editing ? (
        <EditContent form={form} ccRates={ccRates} extraction={extraction} />
      ) : (
        <ReadContent extraction={extraction} ccRates={ccRates} />
      )}
      <div className="h-16" />
    </div>
  );

  const footer = (
    <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={isSaving}>
              <X className="size-4" />
              {t("footer.cancel")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="size-4" />
              {isDeleting ? t("footer.deleting") : t("footer.delete")}
            </Button>
          )}
          {error && (
            <span className="text-sm text-destructive max-w-[200px] truncate" title={error}>
              {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <Button size="sm" onClick={handleSave} disabled={isSaving || !form.isDirty}>
              <Save className="size-4" />
              {isSaving ? t("footer.saving") : t("footer.save")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {t("footer.edit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6">
        {pageContent}
      </div>
      {footer}
    </>
  );
}
