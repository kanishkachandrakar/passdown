import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { requireEnv } from "./env";

/**
 * The server-side client. Reads the caller's session from cookies, so every
 * query runs as that student under RLS.
 *
 * Server Components can't write cookies. The `setAll` catch is expected and
 * harmless — middleware refreshes the session on every request instead.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // called from a Server Component — middleware handles the refresh
        }
      },
    },
  });
}
