import "server-only";

import { createAdminClient } from "./supabase/admin";

/**
 * Time-based cleanup: lapsed reservations, items past their available-until,
 * needs past their needed-by.
 *
 * Three things run this, deliberately overlapping, so the app still behaves
 * correctly months in with no babysitting:
 *
 *   1. pg_cron every minute (see supabase/schema.sql) — the real answer
 *   2. /api/maintenance, for a platform cron if pg_cron isn't available
 *   3. this, opportunistically on page load, throttled to once a minute
 *
 * And if all three somehow miss, `claim_item` still expires a lapsed
 * reservation on the row it's already locking, so a claim is never wrong.
 */

const THROTTLE_MS = 60_000;
let lastSweep = 0;

export async function sweepIfStale() {
  const now = Date.now();
  if (now - lastSweep < THROTTLE_MS) return;
  lastSweep = now;

  try {
    const admin = createAdminClient();
    await admin.rpc("run_maintenance");
  } catch {
    // Cleanup is best-effort. Never let it break a page render — the RPCs
    // that matter re-check expiry themselves.
  }
}

export async function runMaintenance() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("run_maintenance");
  if (error) throw new Error(error.message);
  lastSweep = Date.now();
  return data;
}
