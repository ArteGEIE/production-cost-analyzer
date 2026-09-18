import { redirect } from "next/navigation";

export default async function ProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/productions/${id}/devis`);
}
