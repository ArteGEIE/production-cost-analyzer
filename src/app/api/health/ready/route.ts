import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";

// Readiness probe: can this pod actually serve traffic? A failing DB takes the
// pod out of the ingress rotation without restarting it.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ready" });
  } catch (err) {
    log.error("Readiness check failed:", err);
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
