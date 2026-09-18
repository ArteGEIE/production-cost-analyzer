"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { devisExtractionSchema, type DevisExtraction } from "@/lib/schemas/devis";
import { updateProduction, publishProduction, deleteProductionFile, getProductionById, getDistinctProducteurs } from "@/lib/db/queries";
import { getCcMinimums } from "@/lib/db/queries-cc";
import { getThresholdConfig, type ThresholdConfig } from "@/lib/db/queries-settings";
import type { CcRates } from "@/lib/config/cc-minimums";

export async function fetchExistingProducers(): Promise<string[]> {
  return getDistinctProducteurs();
}

export async function fetchCcRatesAndThresholds(): Promise<{ ccRates: CcRates; thresholds: ThresholdConfig }> {
  const [ccRates, thresholds] = await Promise.all([getCcMinimums(), getThresholdConfig()]);
  return { ccRates, thresholds };
}

export type PublishError = "notAuthenticated" | "invalidData" | "productionNotFound" | "saveFailed";
export type PublishResult = { id: number } | { error: PublishError };

export async function publishProductionAction(
  productionId: number,
  data: DevisExtraction,
): Promise<PublishResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "notAuthenticated" };
  }

  const parsed = devisExtractionSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Invalid devis data on publish:", parsed.error.message);
    return { error: "invalidData" };
  }

  try {
    // GDPR: publish and drop the source PDF atomically. If these ran
    // as separate writes and the delete failed after publish, we'd be left with
    // a published quote still holding its PDF — the exact state RGPD forbids,
    // and one the draft-only stale purge would never reclaim.
    // The draft→published transition is decided server-side from the current
    // status, never from a client-supplied flag.
    const found = await db.transaction(async (tx) => {
      const current = await getProductionById(productionId, { includeDrafts: true, db: tx });
      if (!current) return false;
      await updateProduction(productionId, parsed.data, tx);
      if (current.status === "draft") {
        await publishProduction(productionId, tx);
      }
      await deleteProductionFile(productionId, tx);
      return true;
    });
    if (!found) return { error: "productionNotFound" };
    return { id: productionId };
  } catch (err) {
    console.error("Failed to publish production:", err);
    return { error: "saveFailed" };
  }
}
