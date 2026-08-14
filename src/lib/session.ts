import "server-only";

import { redirect } from "next/navigation";

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

  return { profile, supabase };
}
