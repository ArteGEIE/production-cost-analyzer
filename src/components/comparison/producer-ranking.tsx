"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";

interface ProducerRankingProps {
  ranking: Array<{ producteur: string; avgCoutMinute: number; count: number }>;
  currentProducteur?: string;
}

type SortField = "rank" | "producteur" | "avgCoutMinute" | "count";
type SortDir = "asc" | "desc";

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function ProducerRanking({ ranking, currentProducteur }: ProducerRankingProps) {
  const t = useTranslations("comparison.producerRanking");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Add original rank index before sorting
  const ranked = ranking.map((r, i) => ({ ...r, rank: i + 1 }));

  const sorted = [...ranked].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "rank":
        return (a.rank - b.rank) * dir;
      case "producteur":
        return a.producteur.localeCompare(b.producteur) * dir;
      case "avgCoutMinute":
        return (a.avgCoutMinute - b.avgCoutMinute) * dir;
      case "count":
        return (a.count - b.count) * dir;
      default:
        return 0;
    }
  });

  const headerClass = "cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className={`pb-2 pr-4 ${headerClass}`} onClick={() => handleSort("rank")}>
                    <span className="inline-flex items-center gap-1">{t("rank")} <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th className={`pb-2 pr-4 ${headerClass}`} onClick={() => handleSort("producteur")}>
                    <span className="inline-flex items-center gap-1">{t("producer")} <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th className={`pb-2 pr-4 text-right ${headerClass}`} onClick={() => handleSort("avgCoutMinute")}>
                    <span className="inline-flex items-center justify-end gap-1">{t("avgCostMinute")} <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th className={`pb-2 text-right ${headerClass}`} onClick={() => handleSort("count")}>
                    <span className="inline-flex items-center justify-end gap-1">{t("productionCount")} <ArrowUpDown className="size-3" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.producteur}
                    className={`border-b last:border-0 ${
                      currentProducteur !== undefined && row.producteur === currentProducteur ? "bg-accent" : ""
                    }`}
                  >
                    <td className="py-2 pr-4 tabular-nums">{row.rank}</td>
                    <td className="py-2 pr-4 font-medium">
                      <Link
                        href={`/analytics/producers?name=${encodeURIComponent(row.producteur)}`}
                        className="hover:underline"
                      >
                        {row.producteur}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmt.format(row.avgCoutMinute)}&nbsp;&euro;/min</td>
                    <td className="py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
