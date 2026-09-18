"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, FileText, AlertTriangle, Search, ArrowUp, ArrowDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function anomalyStatus(
  anomalies: unknown,
  verificationMinima: unknown,
  t: (key: string) => unknown
): { color: string; tooltip: string } {
  const tCompliance = (key: string) => t(`compliance.${key}`) as string;
  // Check anomalies array for R1 codes
  if (Array.isArray(anomalies) && anomalies.some((a: { code?: string }) => a.code === "R1")) {
    return { color: "bg-red-500", tooltip: tCompliance("ccDetected") };
  }
  // Check verification_minima for non_conforme statuses (R1 equivalent from seed data)
  if (Array.isArray(verificationMinima)) {
    const hasNonConforme = verificationMinima.some((v: { statut?: string }) => v.statut === "non_conforme");
    if (hasNonConforme) return { color: "bg-red-500", tooltip: tCompliance("ccDetected") };
  }
  // Check anomalies for non-R1 codes
  if (Array.isArray(anomalies) && anomalies.length > 0) return { color: "bg-orange-400", tooltip: tCompliance("issuesDetected") };
  return { color: "bg-green-500", tooltip: tCompliance("noIssues") };
}

function formatDate(dateStr: string): string {
  // Normalize SQLite timestamps (YYYY-MM-DD HH:MM:SS) to ISO-8601
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function countAnomalies(anomalies: unknown, verificationMinima: unknown): number {
  let count = 0;
  if (Array.isArray(anomalies)) count += anomalies.length;
  if (Array.isArray(verificationMinima)) {
    count += verificationMinima.filter(
      (v: { statut?: string }) => v.statut === "non_conforme",
    ).length;
  }
  return count;
}

type SortOption =
  | "date_desc"
  | "date_asc"
  | "titre_asc"
  | "titre_desc"
  | "producteur_asc"
  | "producteur_desc"
  | "type_asc"
  | "type_desc"
  | "cout_minute_asc"
  | "cout_minute_desc"
  | "total_asc"
  | "total_desc";

interface Production {
  id: number;
  producteur: string;
  titre: string;
  typeProduction: string | null;
  totalDevis: number | null;
  coutMinute: number | null;
  confiance: string | null;
  createdAt: string;
  dateDevis: string | null;
  anomalies: unknown;
  verificationMinima: unknown;
  cncFunding: boolean | null;
}

type SortField = "titre" | "producteur" | "type" | "total" | "cout_minute" | "date";

const DEFAULT_DIR: Record<SortField, "asc" | "desc"> = {
  titre: "asc",
  producteur: "asc",
  type: "asc",
  total: "desc",
  cout_minute: "desc",
  date: "desc",
};

function SortableHeader({
  field,
  label,
  sort,
  onSort,
  align = "left",
}: {
  field: SortField;
  label: string;
  sort: SortOption;
  onSort: (s: SortOption) => void;
  align?: "left" | "right";
}) {
  const isActive = sort.startsWith(field + "_");
  const currentDir = isActive ? (sort.endsWith("_asc") ? "asc" : "desc") : null;

  function handleClick() {
    if (isActive) {
      const flipped = currentDir === "asc" ? "desc" : "asc";
      onSort(`${field}_${flipped}` as SortOption);
    } else {
      onSort(`${field}_${DEFAULT_DIR[field]}` as SortOption);
    }
  }

  return (
    <th
      className={`px-4 py-2.5 font-medium select-none cursor-pointer hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"} ${isActive ? "text-foreground" : "text-muted-foreground"}`}
      onClick={handleClick}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowDown className="size-3.5 opacity-0 group-hover:opacity-30" />
        )}
      </span>
    </th>
  );
}

interface ProductionListProps {
  productions: Production[];
  availableTypes: string[];
}

export function ProductionList({ productions, availableTypes }: ProductionListProps) {
  const t = useTranslations("productionList");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [cncFilter, setCncFilter] = useState("Tous");
  const [sort, setSort] = useState<SortOption>("date_desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    let result = productions.filter((p) => {
      const matchesSearch =
        !q ||
        p.titre.toLowerCase().includes(q) ||
        p.producteur.toLowerCase().includes(q);
      const matchesType =
        typeFilter === "Tous" || p.typeProduction === typeFilter;
      const matchesCnc =
        cncFilter === "Tous" ||
        (cncFilter === "Avec" && p.cncFunding === true) ||
        (cncFilter === "Sans" && !p.cncFunding);
      return matchesSearch && matchesType && matchesCnc;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "date_desc":
          return (
            new Date(b.dateDevis ?? b.createdAt).getTime() - new Date(a.dateDevis ?? a.createdAt).getTime()
          );
        case "date_asc":
          return (
            new Date(a.dateDevis ?? a.createdAt).getTime() - new Date(b.dateDevis ?? b.createdAt).getTime()
          );
        case "titre_asc":
          return a.titre.localeCompare(b.titre, "fr");
        case "titre_desc":
          return b.titre.localeCompare(a.titre, "fr");
        case "producteur_asc":
          return a.producteur.localeCompare(b.producteur, "fr");
        case "producteur_desc":
          return b.producteur.localeCompare(a.producteur, "fr");
        case "type_asc":
          return (a.typeProduction ?? "").localeCompare(b.typeProduction ?? "", "fr");
        case "type_desc":
          return (b.typeProduction ?? "").localeCompare(a.typeProduction ?? "", "fr");
        case "cout_minute_asc":
          return (a.coutMinute ?? Infinity) - (b.coutMinute ?? Infinity);
        case "cout_minute_desc":
          return (b.coutMinute ?? -Infinity) - (a.coutMinute ?? -Infinity);
        case "total_asc":
          return (a.totalDevis ?? Infinity) - (b.totalDevis ?? Infinity);
        case "total_desc":
          return (b.totalDevis ?? -Infinity) - (a.totalDevis ?? -Infinity);
        default:
          return 0;
      }
    });

    return result;
  }, [productions, search, typeFilter, cncFilter, sort]);

  return (
    <div>
      <div className="flex h-11 items-center justify-between gap-4 border-b bg-background px-4">
        <h1 className="text-base font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {productions.length}{" "}
          {productions.length === 1 ? t("counts.production") : t("counts.productionPlural")}{" "}
          {productions.length === 1 ? t("counts.recorded") : t("counts.recordedPlural")}
        </p>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-6">

      {productions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <FileText className="size-12 text-muted-foreground/50" />
          <div>
            <p className="text-lg font-medium">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
          </div>
          <Link href="/productions/import" className={buttonVariants({ variant: "outline" })}>
            <Plus className="size-4" />
            {t("empty.import")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("filters.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-8"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={t("filters.typeFilterLabel")}
            >
              <option value="Tous">{t("filters.allTypes")}</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1">
              <select
                value={cncFilter}
                onChange={(e) => setCncFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label={t("filters.cncFilterLabel")}
              >
                <option value="Tous">{t("filters.cncFunding")}</option>
                <option value="Avec">{t("filters.withCnc")}</option>
                <option value="Sans">{t("filters.noCnc")}</option>
              </select>
              <InfoTip>
                {t("filters.cncTooltip")}
              </InfoTip>
            </div>
          </div>

          <div className="-mt-3 mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" /> {t("legend.compliant")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> {t("legend.warning")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> {t("legend.noncompliant")}
            </span>
            {filtered.length !== productions.length && filtered.length > 0 && (
              <span className="ml-auto">
                {filtered.length} {filtered.length === 1 ? t("counts.result") : t("counts.resultPlural")}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search className="size-10 text-muted-foreground/50" />
              <p className="text-lg font-medium">{t("noResults.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("noResults.description")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <SortableHeader field="titre" label={t("table.title")} sort={sort} onSort={setSort} />
                    <SortableHeader field="producteur" label={t("table.producer")} sort={sort} onSort={setSort} />
                    <SortableHeader field="type" label={t("table.type")} sort={sort} onSort={setSort} />
                    <SortableHeader field="total" label={t("table.total")} sort={sort} onSort={setSort} align="right" />
                    <SortableHeader field="cout_minute" label={t("table.costPerMin")} sort={sort} onSort={setSort} align="right" />
                    <SortableHeader field="date" label={t("table.date")} sort={sort} onSort={setSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const anomalyCount = countAnomalies(p.anomalies, p.verificationMinima);
                    const status = anomalyStatus(p.anomalies, p.verificationMinima, t);
                    return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/productions/${p.id}/compliance`}
                          className="inline-flex items-center gap-2 font-medium hover:underline"
                        >
                          <span
                            className={`size-2 shrink-0 rounded-full ${status.color}`}
                            title={anomalyCount > 0 ? t("anomalyTooltip", { count: anomalyCount, statusTooltip: status.tooltip }) : status.tooltip}
                          />
                          <span className="line-clamp-1">{p.titre}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.producteur}</td>
                      <td className="px-4 py-2.5">
                        {p.typeProduction && (
                          <Badge variant="secondary" className="text-xs">
                            {p.typeProduction}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {p.totalDevis != null ? fmt.format(p.totalDevis) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {p.coutMinute != null ? `${fmt.format(p.coutMinute)}/min` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {formatDate(p.dateDevis ?? p.createdAt)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
