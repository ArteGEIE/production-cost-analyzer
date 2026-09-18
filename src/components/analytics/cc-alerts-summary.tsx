"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

interface CcAlert {
  rule: string;
  roleKey: string | null;
  description: string;
  count: number;
  total: number;
}

interface CcAlertsSummaryProps {
  alerts: CcAlert[];
}

export function CcAlertsSummary({ alerts }: CcAlertsSummaryProps) {
  const t = useTranslations("analytics.producers");

  if (alerts.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        {t("alertsEmpty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              {t("rule")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              {t("description")}
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              {t("frequency")}
            </th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {alert.rule}
                </span>
              </td>
              <td className="px-4 py-3">
                {alert.roleKey ? (
                  <Link
                    href={`/analytics/jobs?role=${encodeURIComponent(alert.roleKey)}`}
                    className="text-primary hover:underline"
                  >
                    {alert.description} — {t("nonConformeSuffix")}
                  </Link>
                ) : (
                  <>
                    {alert.description} — {t("nonConformeSuffix")}
                  </>
                )}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {t("frequencyValue", { count: alert.count, total: alert.total })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
