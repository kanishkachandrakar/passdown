/**
 * Env access in one place, with an error that says what to do instead of
 * "Cannot read properties of undefined".
 */

const SETUP_HINT =
  "Copy .env.example to .env.local and fill in your Supabase project URL and keys (Project Settings -> API).";

export function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(`Supabase is not configured. ${SETUP_HINT}`);
  }

  return { url, anonKey };
}

export function requireServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is missing. It is needed to match a released item against other students' needs without exposing those needs to the browser. ${SETUP_HINT}`
    );
  }

  return key;
}

/** True when the app has enough configuration to talk to Supabase at all. */
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
