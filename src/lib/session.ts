import "server-only";

import { redirect } from "next/navigation";

import { ensureDemoSeeded } from "./demo-seed";
import { localInboxUrl } from "./local-dev";
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
    On a local install, a campus nobody has seeded yet gets its sample listings
    the first time somebody from it signs in — no button, no command.

    It lives here rather than in the (app) layout because Next renders layouts
    and pages concurrently: seeding in the layout does not finish before the
    Browse page has already queried an empty items table. Every page awaits
    requireProfile before it fetches anything, so this is the one place that
    reliably comes first.

    Memoised per domain, so it costs one query per process, and deployments
    never run it at all.
  */
  if (localInboxUrl()) await ensureDemoSeeded(profile.institution);

  return { profile, supabase };
}
