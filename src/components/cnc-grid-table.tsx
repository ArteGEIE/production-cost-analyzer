"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cncGrid } from "@/lib/config/cnc-grid";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialGrille = Record<string, any>;

interface CncGridTableProps {
  grilleCnc?: PartialGrille;
  totalDevis?: number;
}

function getCategoryTotal(
  grille: PartialGrille,
  key: string,
): number | undefined {
  const value = grille[key as keyof PartialGrille];
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "total" in value) return value.total;
  return undefined;
}

function formatEuro(amount: number | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(amount: number | undefined, total: number | undefined): string {
  if (amount == null || !total) return "—";
  return `${((amount / total) * 100).toFixed(1)} %`;
}

export function CncGridTable({ grilleCnc, totalDevis }: CncGridTableProps) {
  const t = useTranslations("cncGridTable");
  const tCncGrid = useTranslations("config.cncGrid");
  const tCncGridOrg = useTranslations("config.cncGridOrg");
  const grille = grilleCnc ?? {};
  const sumCategories = cncGrid.reduce(
    (sum, cat) => sum + (getCategoryTotal(grille, cat.key) ?? 0),
    0,
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>{t("category")}</TableHead>
          <TableHead>{t("label")}</TableHead>
          <TableHead className="text-right">{t("amount")}</TableHead>
          <TableHead className="text-right">{t("percent")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cncGrid.map((cat) => {
          const amount = getCategoryTotal(grille, cat.key);
          return (
            <TableRow key={cat.key}>
              <TableCell className="font-medium text-muted-foreground">
                {cat.number}
              </TableCell>
              <TableCell>{tCncGrid(cat.key)}</TableCell>
              <TableCell className="text-muted-foreground">
                {tCncGridOrg(cat.key)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatEuro(amount)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatPercent(amount, totalDevis)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-medium">
            {t("total")}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums font-medium">
            {formatEuro(sumCategories)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {totalDevis
              ? `${((sumCategories / totalDevis) * 100).toFixed(1)} %`
              : "—"}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
