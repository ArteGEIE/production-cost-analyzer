import { getTranslations } from "next-intl/server";
import { AnalyticsTabs } from "@/components/analytics/analytics-tabs";
import { PeriodFilter } from "@/components/analytics/period-filter";
import { TypeFilter } from "@/components/analytics/type-filter";
import { getDistinctTypeProductions } from "@/lib/db/queries";
import { Suspense } from "react";

async function TypeFilterLoader() {
  const types = await getDistinctTypeProductions();
  return <TypeFilter types={types} />;
}

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("analytics");

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex h-11 items-center justify-between gap-4 border-b bg-background px-4">
        <h1 className="text-base font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-4">
          <Suspense>
            <TypeFilterLoader />
          </Suspense>
          <Suspense>
            <PeriodFilter />
          </Suspense>
        </div>
      </div>
      <Suspense>
        <AnalyticsTabs />
      </Suspense>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
      </div>
    </div>
  );
}
