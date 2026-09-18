"use client";

import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { saveThresholdsAction } from "@/app/settings/thresholds/actions";
import type { StructuralThresholds } from "@/lib/config/structural-thresholds";

interface ThresholdsFormProps {
  structural: StructuralThresholds;
  r6MinRate: number;
  r7MaxDeviation: number;
}

export function ThresholdsForm({ structural: initialStructural, r6MinRate: initialR6, r7MaxDeviation: initialR7 }: ThresholdsFormProps) {
  const t = useTranslations("settings.thresholds");
  const [structural, setStructural] = useState(initialStructural);
  const [r6MinRate, setR6MinRate] = useState(initialR6);
  const [r7MaxDeviation, setR7MaxDeviation] = useState(initialR7);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function updateThreshold(key: string, field: "low" | "high", value: string) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    setStructural((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: numValue / 100 },
    }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveThresholdsAction(structural, r6MinRate, r7MaxDeviation);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            {t("structuralTitle")}
            <InfoTip>{t("structuralInfo")}</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {t("structuralDescription")}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("structuralTable.category")}</TableHead>
                <TableHead className="text-right">{t("structuralTable.low")}</TableHead>
                <TableHead className="text-right">{t("structuralTable.high")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(structural).map(([key, threshold]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{threshold.label}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(threshold.low * 100)}
                      onChange={(e) => updateThreshold(key, "low", e.target.value)}
                      className="w-20 ml-auto text-right font-mono tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(threshold.high * 100)}
                      onChange={(e) => updateThreshold(key, "high", e.target.value)}
                      className="w-20 ml-auto text-right font-mono tabular-nums"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("otherTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="r6">{t("r6Label")}</Label>
              <Input
                id="r6"
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(r6MinRate * 100)}
                onChange={(e) => { setR6MinRate((parseFloat(e.target.value) || 0) / 100); setSaved(false); }}
                className="w-28 font-mono tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                {t("r6Help")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r7">{t("r7Label")}</Label>
              <Input
                id="r7"
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(r7MaxDeviation * 100)}
                onChange={(e) => { setR7MaxDeviation((parseFloat(e.target.value) || 0) / 100); setSaved(false); }}
                className="w-28 font-mono tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                {t("r7Help")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {t("save")}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">{t("saved")}</p>}
      </div>
    </div>
  );
}
