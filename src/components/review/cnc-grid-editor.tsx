"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { cncGrid } from "@/lib/config/cnc-grid";
import { calculateCategoryTotal } from "@/lib/calculations/totals";
import type { CcRates } from "@/lib/config/cc-minimums";
import type { GrilleCnc, Ligne, PersonnelLine } from "@/lib/schemas/devis";
import type { ClassifiedLine } from "@/hooks/use-review-form";

interface CncGridEditorProps {
  grilleCnc: GrilleCnc;
  totalDevis: number;
  extractedTotal: number;
  classifiedItems: Record<string, ClassifiedLine[]>;
  ccRates: CcRates;
  onUpdateGrille: (patch: Partial<GrilleCnc>) => void;
  onUpdatePersonnelLine: (index: number, patch: Partial<PersonnelLine>) => void;
  onAddLine?: (categoryKey: string) => void;
  onDeleteLine?: (categoryKey: string, index: number) => void;
  onUpdateClassifiedLine: (category: string, lineIndex: number, montant: number) => void;
  onRemoveClassifiedLine: (category: string, lineIndex: number) => void;
  onMoveLine: (fromCategory: string, lineIndex: number, toCategory: string) => void;
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

/** Inline move-to-category control */
function MoveLineButton({
  currentCategory,
  onMove,
}: {
  currentCategory: string;
  onMove: (targetCategory: string) => void;
}) {
  const t = useTranslations("review.grid");
  const tCncGrid = useTranslations("config.cncGrid");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title={t("moveTo")}
      >
        <ArrowUpDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-0 z-30">
          <Select
            onValueChange={(value: string | null) => {
              if (value) {
                onMove(value);
                setOpen(false);
              }
            }}
            onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }}
            defaultOpen
          >
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder={t("moveToPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {cncGrid
                .filter((cat) => cat.key !== currentCategory)
                .map((cat) => (
                  <SelectItem key={cat.key} value={cat.key} className="text-xs">
                    {cat.number}. {tCncGrid(cat.key)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function getCcAlert(roleKey: string, tarifJournalier: number, ccRates: CcRates): { label: string; minimum: number } | null {
  if (!(roleKey in ccRates)) return null;
  const cc = ccRates[roleKey];
  if (tarifJournalier < cc.minimum) return cc;
  return null;
}

/** Render lignes[] as a table — used for all non-personnel categories */
function LignesTable({
  lignes,
  catKey,
  onUpdateLigne,
  onDeleteLine,
  onMoveLine,
}: {
  lignes: Ligne[];
  catKey: string;
  onUpdateLigne: (catKey: string, index: number, patch: Partial<Ligne>) => void;
  onDeleteLine?: (lineIndex: number) => void;
  onMoveLine: (lineIndex: number, toCategory: string) => void;
}) {
  const t = useTranslations("review.grid");
  if (lignes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noLines")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.poste")}</TableHead>
          <TableHead className="w-32 text-right">{t("columns.amount")}</TableHead>
          <TableHead className="w-24">{t("columns.confidence")}</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((ligne, i) => (
          <TableRow key={i}>
            <TableCell className="text-sm">{ligne.poste}</TableCell>
            <TableCell>
              <Input
                type="number"
                step="0.01"
                value={ligne.montant}
                onChange={(e) => onUpdateLigne(catKey, i, { montant: Number(e.target.value) || 0 })}
                className="h-8 font-mono text-right text-sm"
              />
            </TableCell>
            <TableCell>
              <ConfidenceBadge confiance={ligne.confiance ?? undefined} compact />
            </TableCell>
            <TableCell className="flex items-center gap-1">
              {onDeleteLine && (
                <button
                  type="button"
                  onClick={() => onDeleteLine(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title={t("deleteLine")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <MoveLineButton
                currentCategory={catKey}
                onMove={(target) => onMoveLine(i, target)}
              />
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
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Personnel table editor (category 2) */
function PersonnelEditor({
  postes,
  ccRates,
  onUpdateLine,
  onDeleteLine,
  onMoveLine,
}: {
  postes: PersonnelLine[];
  ccRates: CcRates;
  onUpdateLine: (index: number, patch: Partial<PersonnelLine>) => void;
  onDeleteLine?: (lineIndex: number) => void;
  onMoveLine: (lineIndex: number, toCategory: string) => void;
}) {
  const t = useTranslations("review.grid");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.posteSimple")}</TableHead>
          <TableHead className="w-20">{t("columns.days")}</TableHead>
          <TableHead className="w-28">{t("columns.dailyRate")}</TableHead>
          <TableHead className="w-28 text-right">{t("columns.total")}</TableHead>
          <TableHead className="w-24">{t("columns.confidence")}</TableHead>
          <TableHead className="w-32">{t("columns.cc")}</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {postes.map((line, i) => {
          const ccAlert = getCcAlert(line.role_key, line.tarif_journalier, ccRates);
          return (
            <TableRow key={i}>
              <TableCell>
                <Input
                  value={line.poste}
                  onChange={(e) => onUpdateLine(i, { poste: e.target.value })}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={line.nombre_jours}
                  onChange={(e) => onUpdateLine(i, { nombre_jours: Number(e.target.value) || 0 })}
                  className="h-8 w-20 font-mono text-right text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.tarif_journalier}
                  onChange={(e) => onUpdateLine(i, { tarif_journalier: Number(e.target.value) || 0 })}
                  className={`h-8 w-28 font-mono text-right text-sm ${ccAlert ? "border-red-300 bg-red-50" : ""}`}
                />
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatEuro(line.total)}
              </TableCell>
              <TableCell>
                <ConfidenceBadge confiance={line.confiance ?? "inconnue"} compact />
              </TableCell>
              <TableCell>
                {ccAlert && (
                  <span className="text-xs text-red-600">
                    {t("ccMinimum", { minimum: ccAlert.minimum })}
                  </span>
                )}
              </TableCell>
              <TableCell className="flex items-center gap-1">
                {onDeleteLine && (
                  <button
                    type="button"
                    onClick={() => onDeleteLine(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title={t("deleteLine")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <MoveLineButton
                  currentCategory="2_personnel"
                  onMove={(target) => onMoveLine(i, target)}
                />
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
          <TableCell colSpan={3} />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Classified lines added from unclassified items */
function ClassifiedLines({
  lines,
  category,
  onUpdate,
  onRemove,
}: {
  lines: ClassifiedLine[];
  category: string;
  onUpdate: (category: string, lineIndex: number, montant: number) => void;
  onRemove: (category: string, lineIndex: number) => void;
}) {
  const t = useTranslations("review.grid");
  if (lines.length === 0) return null;
  return (
    <div className="mt-3 border-t border-dashed pt-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("manuallyClassified")}</span>
      <Table>
        <TableBody>
          {lines.map((line, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{line.poste}</TableCell>
              <TableCell className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  value={line.montant}
                  onChange={(e) => onUpdate(category, i, Number(e.target.value) || 0)}
                  className="h-8 font-mono text-right text-sm"
                />
              </TableCell>
              <TableCell className="w-8">
                <button
                  type="button"
                  onClick={() => onRemove(category, i)}
                  className="text-muted-foreground hover:text-destructive text-sm"
                  title={t("remove")}
                >
                  &times;
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CncGridEditor({
  grilleCnc,
  totalDevis,
  extractedTotal,
  classifiedItems,
  ccRates,
  onUpdateGrille,
  onUpdatePersonnelLine,
  onAddLine,
  onDeleteLine,
  onUpdateClassifiedLine,
  onRemoveClassifiedLine,
  onMoveLine,
}: CncGridEditorProps) {
  const t = useTranslations("review.grid");
  const tCncGrid = useTranslations("config.cncGrid");
  // Update a ligne in a non-personnel category
  function handleUpdateLigne(catKey: string, index: number, patch: Partial<Ligne>) {
    const category = grilleCnc[catKey as keyof GrilleCnc] as { lignes: Ligne[]; total: number };
    const lignes = [...category.lignes];
    lignes[index] = { ...lignes[index], ...patch };
    const total = lignes.reduce((sum, l) => sum + l.montant, 0);
    onUpdateGrille({ [catKey]: { ...category, lignes, total } } as unknown as Partial<GrilleCnc>);
  }

  return (
    <div>
      <Accordion multiple className="w-full">
        {cncGrid.map((cat) => {
          const value = grilleCnc[cat.key as keyof GrilleCnc];
          const gridTotal = calculateCategoryTotal(value as { total: number });
          const classifiedExtra = (classifiedItems[cat.key] ?? []).reduce((s, l) => s + l.montant, 0);
          const catTotal = gridTotal + classifiedExtra;
          const hasClassified = (classifiedItems[cat.key] ?? []).length > 0;
          const isPersonnel = cat.key === "2_personnel";

          return (
            <AccordionItem key={cat.key} value={cat.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-center gap-3 pr-2">
                  <span className="w-6 text-sm font-medium text-muted-foreground">{cat.number}</span>
                  <span className="flex-1 text-left text-sm">
                    {tCncGrid(cat.key)}
                    {hasClassified && <span className="ml-1.5 text-xs text-blue-600">+{classifiedItems[cat.key].length}</span>}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums">{formatEuro(catTotal)}</span>
                  <span className="w-14 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatPercent(catTotal, totalDevis)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-2 py-3">
                  {isPersonnel ? (
                    <PersonnelEditor
                      postes={(value as GrilleCnc["2_personnel"]).postes}
                      ccRates={ccRates}
                      onUpdateLine={onUpdatePersonnelLine}
                      onDeleteLine={onDeleteLine ? (lineIndex) => onDeleteLine(cat.key, lineIndex) : undefined}
                      onMoveLine={(lineIndex, toCategory) => onMoveLine(cat.key, lineIndex, toCategory)}
                    />
                  ) : (
                    <LignesTable
                      lignes={(value as { lignes: Ligne[] }).lignes ?? []}
                      catKey={cat.key}
                      onUpdateLigne={handleUpdateLigne}
                      onDeleteLine={onDeleteLine ? (lineIndex) => onDeleteLine(cat.key, lineIndex) : undefined}
                      onMoveLine={(lineIndex, toCategory) => onMoveLine(cat.key, lineIndex, toCategory)}
                    />
                  )}

                  {/* Charges sociales: show rate */}
                  {cat.key === "4_charges_sociales" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("avgRate", {
                        value: (value as GrilleCnc["4_charges_sociales"]).taux_moyen != null
                          ? `${((value as GrilleCnc["4_charges_sociales"]).taux_moyen! * 100).toFixed(0)} %`
                          : "—",
                      })}
                    </p>
                  )}

                  {/* Classified items from unclassified list */}
                  {classifiedItems[cat.key] && (
                    <ClassifiedLines
                      lines={classifiedItems[cat.key]}
                      category={cat.key}
                      onUpdate={onUpdateClassifiedLine}
                      onRemove={onRemoveClassifiedLine}
                    />
                  )}

                  {/* Add line button */}
                  {onAddLine && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => onAddLine(cat.key)}
                    >
                      <Plus className="size-3.5" />
                      {t("addLine")}
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Footer totals */}
      {(() => {
        const delta = totalDevis - extractedTotal;
        const hasDelta = Math.abs(delta) > 1;
        const deltaPct = extractedTotal > 0 ? (delta / extractedTotal) * 100 : 0;
        return (
          <div className="mt-4 space-y-1 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("calculatedTotal")}</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${hasDelta ? "text-amber-600" : ""}`}>
                {formatEuro(totalDevis)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{t("extractedTotal")}</span>
              <span className="text-sm font-mono tabular-nums">{formatEuro(extractedTotal)}</span>
            </div>
            {hasDelta && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-600">{t("delta")}</span>
                <span className="text-sm font-mono tabular-nums text-amber-600">
                  {delta > 0 ? "+" : ""}{formatEuro(delta)} ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)} %)
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
