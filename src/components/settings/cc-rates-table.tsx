"use client";

import { useTranslations } from "next-intl";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { InfoTip } from "@/components/ui/info-tip";

export interface CcRate {
  roleKey: string;
  label: string;
  filiere: string | null;
  niveau: string | null;
  minimumDaily: number;
}

interface CcRatesTableProps {
  rates: CcRate[];
  effectiveFrom: string;
}

function formatDateFr(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function CcRatesTable({ rates, effectiveFrom }: CcRatesTableProps) {
  const t = useTranslations("settings.conventions");
  const tTable = useTranslations("settings.conventions.table");

  return (
    <div>
      {effectiveFrom && (
        <p className="text-sm text-muted-foreground mb-3">
          {t("effectiveSince", { date: formatDateFr(effectiveFrom) })}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tTable("role")}</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                {tTable("filiere")}
                <InfoTip>{tTable("filiereInfo")}</InfoTip>
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                {tTable("niveau")}
                <InfoTip>{tTable("niveauInfo")}</InfoTip>
              </span>
            </TableHead>
            <TableHead className="text-right" title={tTable("base7hTitle")}>{tTable("base7h")}</TableHead>
            <TableHead className="text-right" title={tTable("base8hTitle")}>{tTable("base8h")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r) => (
            <TableRow key={r.roleKey}>
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="text-muted-foreground">{r.filiere}</TableCell>
              <TableCell className="text-muted-foreground">{r.niveau}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatEur(r.minimumDaily * 0.875)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatEur(r.minimumDaily)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
