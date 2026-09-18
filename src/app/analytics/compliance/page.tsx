import { getTranslations } from "next-intl/server";
import { getComplianceMatrix } from "@/lib/analytics/queries-analytics";
import { parsePeriod } from "@/lib/analytics/parse-period";
import { ComplianceMatrixTable } from "./compliance-tables";
import { InfoTip } from "@/components/ui/info-tip";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CompliancePage({ searchParams }: Props) {
  const t = await getTranslations("analytics.compliance");
  const params = await searchParams;
  const period = parsePeriod(params);
  const typeProduction = params.type;

  const { roles, producers } = await getComplianceMatrix(period, typeProduction);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pageTitle")}{" "}
          <InfoTip>{t("pageInfoTip")}</InfoTip>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
          <span className="ml-3 inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100" /> {t("legendNonConforme")}</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-100" /> {t("legendConforme")}</span>
          </span>
        </p>
      </div>
      <ComplianceMatrixTable roles={roles} producers={producers} />
    </div>
  );
}
