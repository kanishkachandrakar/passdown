import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { requireEnv, requireServiceRoleKey } from "./env";

/**
 * Service-role client. Bypasses RLS, so it never goes near a component.
 *
 * Exactly one job: when a student releases an item, score it against every
 * open need on campus. Those needs belong to other students and are not
 * readable by the releaser — the server reads them, writes `matches` rows, and
 * hands back a count. No need rows ever reach the browser.
 */
export function createAdminClient() {
  const { url } = requireEnv();

  return createSupabaseClient<Database>(url, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
