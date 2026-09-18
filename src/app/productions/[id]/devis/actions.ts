"use server";

import { revalidatePath } from "next/cache";
import { devisExtractionSchema } from "@/lib/schemas/devis";
import type { DevisExtraction } from "@/lib/schemas/devis";
import { updateProduction, deleteProduction } from "@/lib/db/queries";

export type UpdateProductionError = "invalidData" | "updateFailed";
export type UpdateProductionResult = { success: true } | { error: UpdateProductionError };

export type DeleteProductionError = "deleteFailed";
export type DeleteProductionResult = { success: true } | { error: DeleteProductionError };

export async function updateProductionAction(
  productionId: number,
  data: DevisExtraction,
): Promise<UpdateProductionResult> {
  const parsed = devisExtractionSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Invalid devis data on update:", parsed.error.message);
    return { error: "invalidData" };
  }

  try {
    await updateProduction(productionId, parsed.data);
    revalidatePath(`/productions/${productionId}`);
    revalidatePath(`/productions/${productionId}/devis`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update production:", { productionId, error });
    return { error: "updateFailed" };
  }
}

export async function deleteProductionAction(
  productionId: number,
): Promise<DeleteProductionResult> {
  try {
    await deleteProduction(productionId);
    revalidatePath("/productions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete production:", { productionId, error });
    return { error: "deleteFailed" };
  }
}
