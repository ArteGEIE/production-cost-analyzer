import { getTranslations } from "next-intl/server";
import { getThresholdConfig } from "@/lib/db/queries-settings";
import { ThresholdsForm } from "@/components/settings/thresholds-form";
import { InfoTip } from "@/components/ui/info-tip";

export default async function ThresholdsPage() {
  const t = await getTranslations("settings.thresholds");
  const config = await getThresholdConfig();

  const rules = [
    { code: "R1", key: "r1" as const, severity: "high" as const },
    { code: "R3", key: "r3" as const, severity: "warning" as const },
    { code: "R4", key: "r4" as const, severity: "info" as const },
    { code: "R5", key: "r5" as const, severity: "warning" as const },
    { code: "R6", key: "r6" as const, severity: "warning" as const },
    { code: "R7", key: "r7" as const, severity: "warning" as const },
  ];

  const severityClasses: Record<"high" | "warning" | "info", string> = {
    high: "rounded bg-red-100 px-1.5 py-0.5 text-red-800",
    warning: "rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800",
    info: "rounded bg-blue-100 px-1.5 py-0.5 text-blue-800",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          {t("rulesTitle")}
          <InfoTip>{t("rulesInfo")}</InfoTip>
        </h2>
        <p>{t("rulesDescription")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1.5 pr-3 font-medium text-foreground">{t("table.code")}</th>
                <th className="py-1.5 pr-3 font-medium text-foreground">{t("table.rule")}</th>
                <th className="py-1.5 pr-3 font-medium text-foreground">{t("table.condition")}</th>
                <th className="py-1.5 font-medium text-foreground">{t("table.severity")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((rule) => (
                <tr key={rule.code}>
                  <td className="py-1.5 pr-3 font-mono">{rule.code}</td>
                  <td className="py-1.5 pr-3">{t(`rules.${rule.key}.name`)}</td>
                  <td className="py-1.5 pr-3">{t(`rules.${rule.key}.condition`)}</td>
                  <td className="py-1.5">
                    <span className={severityClasses[rule.severity]}>{t(`severity.${rule.severity}`)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ThresholdsForm
        structural={config.structural}
        r6MinRate={config.r6MinRate}
        r7MaxDeviation={config.r7MaxDeviation}
      />
    </div>
  );
}
