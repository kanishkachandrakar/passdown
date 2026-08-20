/**
 * Local development detection.
 *
 * Running against the local Supabase stack, no email ever leaves the machine —
 * it is captured by Mailpit instead. That is the right behaviour, and it is
 * also the single most confusing thing about running this project for the
 * first time: you sign up, and then you wait forever for a message that was
 * never going to arrive.
 *
 * So the verify screen says so, with a link, exactly where somebody would
 * otherwise be stuck. The check keys off the Supabase URL, so a deployed app
 * pointing at a hosted project never shows any of it.
 */

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "0.0.0.0", "[::1]"];

/** Mailpit's port in the standard Supabase local stack. */
const MAILPIT_PORT = 54324;

export function localInboxUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (!LOCAL_HOSTS.includes(url.hostname)) return null;
    return `${url.protocol}//${url.hostname}:${MAILPIT_PORT}`;
  } catch {
    return null;
  }
}
