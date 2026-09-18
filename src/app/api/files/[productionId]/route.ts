import { auth } from "@/lib/auth";
import { getDraftProductionFile } from "@/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ productionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non authentifié", { status: 401 });
  }

  const { productionId } = await params;
  const id = Number(productionId);
  if (!id || isNaN(id)) {
    return new Response("ID invalide", { status: 400 });
  }

  // GDPR: only a draft's source PDF is served — published quotes never
  // expose their original devis, even if a file row somehow lingered.
  const file = await getDraftProductionFile(id);
  if (!file) {
    return new Response("Fichier non trouvé", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/[\r\n"]/g, "_")}"`,
      // GDPR: transient resource — don't let the browser retain it past publish.
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
