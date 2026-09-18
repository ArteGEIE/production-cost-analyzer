"use server";

import { revalidatePath } from "next/cache";
import { setProductionTypes } from "@/lib/db/queries-settings";
import { renameProductionType } from "@/lib/db/queries";

export type SaveProductionTypesResult = { success: true } | { error: "saveFailed" };

export type RenameProductionTypeError = "nameRequired" | "renameFailed";
export type RenameProductionTypeResult = { success: true } | { error: RenameProductionTypeError };

export async function saveProductionTypesAction(types: string[]): Promise<SaveProductionTypesResult> {
  try {
    await setProductionTypes(types);
    revalidatePath("/settings/types");
    return { success: true };
  } catch (error) {
    console.error("Failed to save production types:", error);
    return { error: "saveFailed" };
  }
}

export async function renameProductionTypeAction(oldType: string, newType: string): Promise<RenameProductionTypeResult> {
  if (!oldType.trim() || !newType.trim()) return { error: "nameRequired" };

  try {
    await renameProductionType(oldType, newType);
    revalidatePath("/settings/types");
    revalidatePath("/productions");
    return { success: true };
  } catch (error) {
    console.error("Failed to rename production type:", error);
    return { error: "renameFailed" };
  }
}
