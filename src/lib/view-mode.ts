import "server-only";

import { cookies } from "next/headers";

/**
 * Demo view vs user view.
 *
 * The only fictional data in Passdown is the `demo_demand` list behind
 * "Students near you need". It is always labelled, but a label is a claim and
 * a switch is a demonstration — flicking to user view shows exactly what is
 * left when nothing invented is on screen, which is the honest answer to
 * "how much of this is real?"
 *
 * Everything else on every screen is rows created by real accounts, so the
 * switch does not touch them.
 */

export type ViewMode = "demo" | "user";

export const VIEW_MODE_COOKIE = "passdown_view";

export async function getViewMode(): Promise<ViewMode> {
  const store = await cookies();
  return store.get(VIEW_MODE_COOKIE)?.value === "user" ? "user" : "demo";
}
