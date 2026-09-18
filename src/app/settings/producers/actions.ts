"use server";

import { revalidatePath } from "next/cache";
import { renameProducteur } from "@/lib/db/queries";

export type RenameProducerError = "nameRequired" | "renameFailed";
export type RenameProducerResult = { count: number } | { error: RenameProducerError };

export async function renameProducerAction(oldName: string, newName: string): Promise<RenameProducerResult> {
  if (!oldName.trim() || !newName.trim()) return { error: "nameRequired" };
  if (oldName === newName) return { count: 0 };

  try {
    const count = await renameProducteur(oldName, newName);
    revalidatePath("/settings/producers");
    revalidatePath("/productions");
    return { count };
  } catch (error) {
    console.error("Failed to rename producer:", error);
    return { error: "renameFailed" };
  }
}
