"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { requireEnv } from "./env";

/** The browser client. Used only where a component needs its own session. */
export function createClient() {
  const { url, anonKey } = requireEnv();
  return createBrowserClient<Database>(url, anonKey);
}
