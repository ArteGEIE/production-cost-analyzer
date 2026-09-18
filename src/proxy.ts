import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Auth.js middleware adapted for Next.js 16 proxy convention. `auth` is
// overloaded and its middleware signature is not exported, hence the cast.
export default function proxy(req: NextRequest) {
  return (auth as unknown as (req: NextRequest) => unknown)(req);
}

export const config = {
  matcher: [
    // api/health is excluded so k8s probes reach the handlers instead of a 307
    // to /sign-in. The lookahead is anchored after the leading slash, so this is
    // prefix semantics — it covers /api/health/ready too.
    "/((?!sign-in|api/auth|api/health|_next/static|_next/image|favicon.ico).*)",
  ],
};
