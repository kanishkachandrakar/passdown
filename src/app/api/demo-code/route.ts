import { NextResponse, type NextRequest } from "next/server";

import { checkInstitutionalEmail } from "@/lib/institution";
import { envFlag } from "@/lib/local-dev";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Mints a sign-in code and returns it, so the verify screen can show it.
 *
 * ────────────────────────────────────────────────────────────────────────
 *  THIS IS AN AUTHENTICATION BYPASS. It exists so that a demo can be
 *  evaluated without anybody owning an inbox.
 *
 *  While DEMO_OPEN_SIGNIN is on, anyone who knows an address can read that
 *  address's code and sign in as them. That is acceptable on a deployment
 *  holding nothing but sample data, and unacceptable the moment a real
 *  student's account exists.
 *
 *  Turn it off by removing DEMO_OPEN_SIGNIN (and NEXT_PUBLIC_DEMO_OPEN_SIGNIN)
 *  from the environment. Sign-in reverts to emailed codes with no code change.
 * ────────────────────────────────────────────────────────────────────────
 *
 * DEMO_ACCOUNT_EMAIL still works on its own, and is the narrower option:
 * one designated address rather than all of them.
 */
export async function GET(request: NextRequest) {
  const openSignin = envFlag(process.env.DEMO_OPEN_SIGNIN);
  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase();

  if (!openSignin && !demoEmail) {
    // Config state, not a credential — and without it a misconfigured
    // deployment is indistinguishable from a correctly locked-down one.
    return NextResponse.json(
      { error: "Not available.", reason: "demo sign-in is not enabled" },
      { status: 404 }
    );
  }

  const asked = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!asked) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  // Even wide open, the institutional rule still applies — otherwise this
  // becomes a way to create accounts at arbitrary domains.
  const check = checkInstitutionalEmail(asked);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const allowed = openSignin || asked === demoEmail;
  if (!allowed) {
    return NextResponse.json(
      { error: "Not available.", reason: "not the designated demo account" },
      { status: 404 }
    );
  }

  try {
    const admin = createAdminClient();

    // generateLink mints a one-time code WITHOUT sending mail. That is what
    // makes this immune to the project's hourly email limit — no message is
    // ever sent, so there is nothing to rate limit.
    const mint = () =>
      admin.auth.admin.generateLink({ type: "magiclink", email: check.email });

    let { data, error } = await mint();

    /*
      Locally, generateLink creates the account itself, so this branch never
      runs. A hosted project is where it earns its keep: depending on the
      auth settings, a first-time address comes back either "user not found"
      or "signups not allowed for otp" — and the promise on the verify screen,
      "any university email, real or made up", is false in both cases unless
      we create the account ourselves. Admin createUser is not subject to the
      signup setting; the trigger on auth.users then fills in the profile, so
      the address lands on campus with a name and an institution derived from
      the domain, exactly as an emailed signup would.
    */
    if (error && /not found|not exist|not allowed|disabled/i.test(error.message)) {
      const { error: createError } = await admin.auth.admin.createUser({
        email: check.email,
        email_confirm: true,
      });
      if (createError) {
        return NextResponse.json({ code: null, error: createError.message });
      }
      ({ data, error } = await mint());
    }

    if (error) {
      return NextResponse.json({ code: null, error: error.message });
    }

    return NextResponse.json({ code: data.properties?.email_otp ?? null });
  } catch (thrown) {
    // A missing service-role key throws here. Saying so beats a silent null
    // that the screen can only render as "still fetching".
    return NextResponse.json({
      code: null,
      error: thrown instanceof Error ? thrown.message : "could not mint a code",
    });
  }
}
