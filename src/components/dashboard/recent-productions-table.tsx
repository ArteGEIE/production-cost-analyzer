import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function countAlerts(anomalies: unknown, verificationMinima: unknown): number {
  let count = 0;
  if (Array.isArray(anomalies)) {
    count += anomalies.filter((a: { code?: string }) => a.code === "R1").length;
  }
  if (Array.isArray(verificationMinima)) {
    count += verificationMinima.filter(
      (v: { statut?: string }) => v.statut === "non_conforme",
    ).length;
  }
  return count;
}

interface Production {
  id: number;
  producteur: string;
  titre: string;
  typeProduction: string | null;
  coutMinute: number | null;
  createdAt: string;
  dateDevis: string | null;
  anomalies: unknown;
  verificationMinima: unknown;
}

interface RecentProductionsTableProps {
  productions: Production[];
}

export async function RecentProductionsTable({ productions }: RecentProductionsTableProps) {
  const t = await getTranslations("dashboard.recentTable");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">{t("columns.producer")}</th>
              <th className="px-4 py-2.5 text-left font-medium">{t("columns.title")}</th>
              <th className="px-4 py-2.5 text-left font-medium">{t("columns.type")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("columns.costPerMin")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("columns.date")}</th>
              <th className="px-4 py-2.5 text-right font-medium" title={t("alertsTitle")}>{t("columns.alerts")}</th>
            </tr>
          </thead>
          <tbody>
            {productions.map((p) => {
              const alerts = countAlerts(p.anomalies, p.verificationMinima);
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground">{p.producteur}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/productions/${p.id}/compliance`}
                      className="font-medium hover:underline"
                    >
                      <span className="line-clamp-1">{p.titre}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.typeProduction && (
                      <Badge variant="secondary" className="text-xs">{p.typeProduction}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {p.coutMinute != null ? `${fmt.format(p.coutMinute)}/min` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {formatDate(p.dateDevis ?? p.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {alerts > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="mr-1 size-3" />
                        {alerts}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t px-4 py-3">
          <Link
            href="/productions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
