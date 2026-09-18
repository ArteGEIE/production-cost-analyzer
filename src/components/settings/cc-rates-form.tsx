"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Save, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { saveCcRatePeriodAction } from "@/app/settings/conventions/actions";
import type { CcRate } from "./cc-rates-table";

interface CcRatesFormProps {
  currentRates: CcRate[];
  latestEffectiveFrom: string;
}

export function CcRatesForm({ currentRates, latestEffectiveFrom }: CcRatesFormProps) {
  const t = useTranslations("settings.conventions");
  const tTable = useTranslations("settings.conventions.table");
  const tForm = useTranslations("settings.conventions.form");
  const [open, setOpen] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [rates, setRates] = useState<CcRate[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setRates(currentRates.map((r) => ({ ...r })));
      setEffectiveFrom("");
      setError(null);
    }
    setOpen(isOpen);
  }

  function updateRate(index: number, value: string) {
    setRates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], minimumDaily: parseFloat(value) || 0 };
      return next;
    });
  }

  function handleSave() {
    if (!effectiveFrom) {
      setError(tForm("errors.dateRequired"));
      return;
    }
    if (effectiveFrom <= latestEffectiveFrom) {
      setError(tForm("errors.dateTooEarly", { date: latestEffectiveFrom }));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await saveCcRatePeriodAction(
        effectiveFrom,
        rates.map((r) => ({
          roleKey: r.roleKey,
          label: r.label,
          minimumDaily: r.minimumDaily,
          filiere: r.filiere ?? undefined,
          niveau: r.niveau ?? undefined,
        })),
      );
      if ("error" in result) {
        setError(
          result.error === "dateAndRatesRequired"
            ? tForm("errors.dateAndRatesRequired")
            : tForm("errors.saveFailed"),
        );
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <RefreshCw className="size-3.5" />
        {t("updateButton")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{tForm("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {tForm("dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1.5">
            <Label htmlFor="effective-from">{tForm("effectiveFromLabel")}</Label>
            <Input
              id="effective-from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-48"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tTable("role")}</TableHead>
                <TableHead>{tTable("filiere")}</TableHead>
                <TableHead>{tTable("niveau")}</TableHead>
                <TableHead className="text-right">{tTable("base7h")}</TableHead>
                <TableHead className="text-right">{tTable("base8h")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r, i) => (
                <TableRow key={r.roleKey}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-muted-foreground">{r.filiere}</TableCell>
                  <TableCell className="text-muted-foreground">{r.niveau}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {(r.minimumDaily * 0.875).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.minimumDaily}
                      onChange={(e) => updateRate(i, e.target.value)}
                      className="w-28 ml-auto text-right font-mono tabular-nums"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {tForm("cancel")}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {tForm("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
