import { getTranslations } from "next-intl/server";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex h-11 items-center gap-4 border-b bg-background px-4">
        <h1 className="text-base font-semibold">{t("title")}</h1>
      </div>
      <SettingsTabs />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
