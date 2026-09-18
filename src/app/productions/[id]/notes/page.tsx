import { getTranslations } from "next-intl/server";
import { getProductionById } from "@/lib/db/queries";
import { getNotesByProductionId } from "@/lib/db/queries-notes";
import { NotesView } from "./notes-view";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " à "
    + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productionId = Number(id);
  const t = await getTranslations("notes");
  const [production, notes] = await Promise.all([
    getProductionById(productionId),
    getNotesByProductionId(productionId),
  ]);

  return (
    <>
      {production?.userName && (
        <p className="mx-auto w-full max-w-2xl px-4 pt-6 text-xs text-muted-foreground">
          {t("importedBy", { userName: production.userName, date: formatDateTime(production.createdAt) })}
        </p>
      )}
      <NotesView productionId={productionId} initialNotes={notes} />
    </>
  );
}
