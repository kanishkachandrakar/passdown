import "server-only";

import { redirect } from "next/navigation";

import { ensureDemoSeeded } from "./demo-seed";
import { envFlag, localInboxUrl } from "./local-dev";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * The signed-in student, or a redirect to /verify.
 *
 * Middleware already guards these routes; this exists so page code gets a
 * typed profile without repeating the null checks.
 */
export async function requireProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/verify");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // The signup trigger creates this row. If it is genuinely missing, the
    // session is not usable — send them back through verification.
    redirect("/verify");
  }

  /*
    A campus nobody has seeded yet gets its listings the first time somebody
    from it signs in — no button, no command. That happens on any local
    install, and on a deployment only for the demo account's own institution,
    so a real campus never has anything invented on it.

    It lives here rather than in the (app) layout because Next renders layouts
    and pages concurrently: seeding in the layout does not finish before the
    Browse page has already queried an empty items table. Every page awaits
    requireProfile before it fetches anything, so this is the one place that
    reliably comes first.

    Memoised per domain, so it costs one query per process, and deployments
    never run it at all.
  */
  const demoInstitution = (
    process.env.DEMO_ACCOUNT_EMAIL ?? process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL
  )
    ?.split("@")[1]
    ?.toLowerCase();
  /*
    Open sign-in lets anyone in under any domain, so pinning this to the demo
    account's institution meant a judge signing in as judge@ox.ac.uk landed on
    a campus with nothing on it — Browse empty, matching with nothing to match.
    While that flag is on, every institution that shows up gets seeded; the
    listings are labelled Demo Campus Preview either way. With it off this is
    unchanged, and a real campus still never has anything invented on it.
  */
  const openSignin =
    envFlag(process.env.DEMO_OPEN_SIGNIN) ||
    envFlag(process.env.NEXT_PUBLIC_DEMO_OPEN_SIGNIN);
  if (
    localInboxUrl() ||
    openSignin ||
    profile.institution.toLowerCase() === demoInstitution
  ) {
    await ensureDemoSeeded(profile.institution);
  }

  return { profile, supabase };
}
