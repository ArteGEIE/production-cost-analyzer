import { getTranslations } from "next-intl/server";
import { getCcMinimums, getAllCcRatePeriods } from "@/lib/db/queries-cc";
import { CcRatesTable } from "@/components/settings/cc-rates-table";
import { CcRatesForm } from "@/components/settings/cc-rates-form";
import { CcHistoryPanel } from "@/components/settings/cc-history-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";

export default async function ConventionsPage() {
  const t = await getTranslations("settings.conventions");
  const [currentRates, allPeriods] = await Promise.all([
    getCcMinimums(),
    getAllCcRatePeriods(),
  ]);

  const periodDates = [...allPeriods.keys()].sort().reverse();
  const latestDate = periodDates[0] ?? null;

  // Current rates as array, enriched with filiere/niveau from DB
  const latestPeriod = latestDate ? allPeriods.get(latestDate) : undefined;
  const currentArray = Object.entries(currentRates)
    .map(([key, val]) => {
      const match = latestPeriod?.find((r) => r.roleKey === key);
      return {
        roleKey: key,
        label: val.label,
        filiere: match?.filiere ?? null,
        niveau: match?.niveau ?? null,
        minimumDaily: val.minimum,
      };
    });

  // History: all periods except the latest
  const historyPeriods = periodDates.slice(1).map((date) => ({
    effectiveFrom: date,
    rates: allPeriods.get(date) ?? [],
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex justify-end">
        <CcRatesForm currentRates={currentArray} latestEffectiveFrom={latestDate ?? ""} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            {t("currentTitle")}
            <InfoTip>{t("currentInfo")}</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CcRatesTable rates={currentArray} effectiveFrom={latestDate ?? ""} />
        </CardContent>
      </Card>

      {historyPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("historyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CcHistoryPanel periods={historyPeriods} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
