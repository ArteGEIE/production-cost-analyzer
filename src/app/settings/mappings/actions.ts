"use server";

import { revalidatePath } from "next/cache";
import { setCncMapping } from "@/lib/db/queries-settings";
import type { CncRoleMapping } from "@/lib/config/cnc-mapping";

export async function saveCncMappingAction(mapping: CncRoleMapping[]) {
  await setCncMapping(mapping);
  revalidatePath("/settings/mappings");
}
