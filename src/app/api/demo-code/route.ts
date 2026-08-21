import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The sign-in code for ONE designated demo account, shown on screen.
 *
 * Judges shouldn't need an inbox to look round the app. But a screen that
 * prints whatever code you ask for is not a convenience, it is an
 * authentication bypass: anyone could type a real student's address, read
 * their code and sign in as them.
 *
 * So this answers for exactly one address — whatever DEMO_ACCOUNT_EMAIL is set
 * to — and 404s for every other. Signing in as the demo account is expected;
 * no other account is reachable this way.
 *
 * Unset the env var and this endpoint stops existing.
 */
export async function GET(request: NextRequest) {
  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase();
  if (!demoEmail) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const asked = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!asked || asked !== demoEmail) {
    // Deliberately the same response as "not configured": no hinting that a
    // demo account exists under some other address.
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const admin = createAdminClient();

    // generateLink mints a fresh one-time code without sending an email, which
    // is the only way to know the code on a deployment where mail goes to a
    // real inbox we cannot read.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: demoEmail,
    });

    if (error) {
      return NextResponse.json({ code: null, error: error.message });
    }

    return NextResponse.json({ code: data.properties?.email_otp ?? null });
  } catch {
    return NextResponse.json({ code: null });
  }
}
