"use server";

import { revalidatePath } from "next/cache";
import { insertCcRatePeriod } from "@/lib/db/queries-cc";

export type SaveCcRatePeriodError = "dateAndRatesRequired" | "saveFailed";
export type SaveCcRatePeriodResult = { success: true } | { error: SaveCcRatePeriodError };

export async function saveCcRatePeriodAction(
  effectiveFrom: string,
  rates: { roleKey: string; label: string; minimumDaily: number; filiere?: string; niveau?: string }[],
): Promise<SaveCcRatePeriodResult> {
  if (!effectiveFrom || rates.length === 0) {
    return { error: "dateAndRatesRequired" };
  }

  try {
    await insertCcRatePeriod(effectiveFrom, rates);
    revalidatePath("/settings/conventions");
    return { success: true };
  } catch (error) {
    console.error("Failed to save CC rate period:", error);
    return { error: "saveFailed" };
  }
}
