// Liveness + startup probe. Deliberately does NOT touch the database: a
// DB-checking liveness probe would restart-loop every pod during a DB blip and
// turn a brief outage into a long one. Readiness (./ready) owns the DB check.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok" });
}
