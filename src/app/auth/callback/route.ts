import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where the "tap here to sign in" link in the email lands.
 *
 * Supabase sends the browser here with a one-time `code`, which is traded for
 * a session. The verify screen's typed six digits do the same job; this exists
 * because most people tap the link rather than copy digits out of an email.
 *
 * PKCE ties the code to the browser that asked for it, so opening the link on
 * a different device fails by design — hence the fallback message pointing
 * back at the code.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(`${origin}/verify?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/verify?error=link`);
  }

  // Relative paths only — an open redirect here would hand an attacker a
  // signed-in session on a page they control.
  const destination = next.startsWith("/") ? next : "/home";
  return NextResponse.redirect(`${origin}${destination}`);
}
