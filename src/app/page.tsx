import { getTranslations } from "next-intl/server";
import { getAllProductions } from "@/lib/db/queries";
import { computeDashboardData } from "@/lib/dashboard/compute-dashboard-data";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { ProducerCostChart } from "@/components/dashboard/producer-cost-chart";
import { RecentProductionsTable } from "@/components/dashboard/recent-productions-table";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const productions = await getAllProductions();
  const { totalCount, alertCount, avgCoutMinute, producerCount, chartData, recent } =
    computeDashboardData(productions);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <DashboardKpis
        totalCount={totalCount}
        alertCount={alertCount}
        avgCoutMinute={avgCoutMinute}
        producerCount={producerCount}
      />

      <ProducerCostChart data={chartData} globalAvg={avgCoutMinute} />

      <RecentProductionsTable productions={recent} />
    </div>
  );
}
