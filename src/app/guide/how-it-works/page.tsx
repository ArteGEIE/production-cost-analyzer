import { getTranslations } from "next-intl/server";

export default async function HowItWorksPage() {
  const t = await getTranslations("guide.howItWorks");
  const steps = t.raw("steps") as { title: string; description: string }[];
  const stats = t.raw("performance.stats") as { label: string; value: string; detail: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Pipeline */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <Step key={step.title} number={index + 1} title={step.title} description={step.description} />
        ))}
      </div>

      {/* Cost and performance */}
      <div className="rounded-lg border bg-muted/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold">{t("performance.title")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, detail }) => (
            <Stat key={label} label={label} value={value} detail={detail} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
