import { getTranslations } from "next-intl/server";
import { GuideTabs } from "@/components/guide/guide-tabs";

export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("guide");

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex h-11 items-center gap-4 border-b bg-background px-4">
        <h1 className="text-base font-semibold">{t("title")}</h1>
      </div>
      <GuideTabs />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
