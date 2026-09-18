import { getTranslations } from "next-intl/server";

export default async function FaqPage() {
  const t = await getTranslations("guide.faq");
  const faqs = t.raw("items") as { question: string; answer: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="divide-y">
        {faqs.map(({ question, answer }) => (
          <div key={question} className="py-5 first:pt-0 last:pb-0">
            <h3 className="text-sm font-semibold">{question}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
