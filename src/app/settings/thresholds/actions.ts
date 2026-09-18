"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/db/queries-settings";

export async function saveThresholdsAction(
  structural: Record<string, { low: number; high: number; label: string }>,
  r6MinRate: number,
  r7MaxDeviation: number,
) {
  await Promise.all([
    setSetting("structural_thresholds", JSON.stringify(structural)),
    setSetting("r6_social_charges_min_rate", JSON.stringify(r6MinRate)),
    setSetting("r7_cost_minute_deviation", JSON.stringify(r7MaxDeviation)),
  ]);
  revalidatePath("/settings/thresholds");
}
