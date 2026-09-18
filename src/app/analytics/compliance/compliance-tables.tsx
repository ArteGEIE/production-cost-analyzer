"use client";

import { useTranslations } from "next-intl";
import type { ComplianceMatrixRow } from "@/lib/analytics/queries-analytics";

interface Props {
  roles: ComplianceMatrixRow[];
  producers: string[];
}

const statutStyles = {
  conforme: "bg-green-50 text-green-700",
  non_conforme: "bg-red-50 text-red-700",
  no_data: "",
} as const;

export function ComplianceMatrixTable({ roles, producers }: Props) {
  const t = useTranslations("analytics.compliance");

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-40">
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-50 bg-muted px-4 py-3 text-left font-medium">
              {t("metier")}
            </th>
            <th className="sticky left-[200px] z-50 bg-muted px-4 py-3 text-right font-medium whitespace-nowrap border-r">
              {t("ccMinimum")}
            </th>
            {producers.map((p) => (
              <th
                key={p}
                className="bg-muted px-4 py-3 text-right font-medium whitespace-nowrap"
              >
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.roleKey} className="border-b last:border-b-0">
              <td className="sticky left-0 z-20 bg-background px-4 py-2.5 font-medium min-w-[200px]">
                {role.label}
              </td>
              <td className="sticky left-[200px] z-20 bg-background px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap border-r">
                {role.ccMinimum != null ? `${role.ccMinimum.toFixed(2)} €` : <span className="text-xs">{t("horsCC")}</span>}
              </td>
              {role.producers.map((entry) => (
                <td
                  key={entry.producteur}
                  className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${statutStyles[entry.statut]}`}
                  title={
                    entry.statut === "no_data"
                      ? t("titleNoData", { producteur: entry.producteur })
                      : `${t("titleWithData", { producteur: entry.producteur, rate: Math.round(entry.avgRate), count: entry.occurrences })}${role.ccMinimum != null ? t("titleCcMinSuffix", { min: role.ccMinimum.toFixed(2) }) : ""}`
                  }
                >
                  {entry.statut === "no_data" ? (
                    ""
                  ) : (
                    <div>
                      <span className="font-medium">
                        {Math.round(entry.avgRate)} €
                      </span>
                      <span className="block text-xs opacity-60">
                        ×{entry.occurrences}
                      </span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
