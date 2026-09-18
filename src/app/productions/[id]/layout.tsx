import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getProductionById } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { ProductionTabs } from "@/components/production-tabs";

export default async function ProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const production = await getProductionById(Number(id));
  if (!production) notFound();
  const t = await getTranslations("productionLayout");

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b bg-background px-4 pt-4 pb-0">
        <div className="flex items-start gap-3">
          <Link
            href="/productions"
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
            aria-label={t("backToList")}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{production.titre}</h1>
            <p className="text-sm text-muted-foreground truncate">{production.producteur}</p>
          </div>
        </div>
      </div>
      <ProductionTabs productionId={id} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
