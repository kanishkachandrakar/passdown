import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy-session";

/**
 * Next 16 renamed the `middleware` convention to `proxy`.
 *
 * Its job here is the auth session: redeem the Supabase refresh token on every
 * navigation and write the rotated cookies back. That is what keeps a student
 * signed in when they open Passdown again next term instead of being bounced
 * to the verify screen.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
