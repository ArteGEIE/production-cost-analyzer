import { FileUp, Search, ShieldCheck, BarChart3, Settings, PenLine } from "lucide-react";
import { getTranslations } from "next-intl/server";

const icons = [FileUp, PenLine, ShieldCheck, BarChart3, Search, Settings];

export default async function FeaturesPage() {
  const t = await getTranslations("guide.features");
  const items = t.raw("items") as { title: string; description: string }[];
  const features = items.map((item, index) => ({ ...item, icon: icons[index] }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
