"use server";

import { revalidatePath } from "next/cache";

import { removeDemoFor, seedDemoFor } from "@/lib/demo-seed";
import { localInboxUrl } from "@/lib/local-dev";
import { requireProfile } from "@/lib/session";
import { fail, type ActionState } from "./shared";

/**
 * Fill Browse with sample listings, from a button rather than a terminal.
 *
 * Someone evaluating this should not have to know what npm is to see what the
 * app looks like with things on it.
 *
 * Local installs only — the check keys off the Supabase URL, so a deployed
 * build cannot seed sample data into a real campus even if someone hits the
 * endpoint directly. Sample rows are always scoped to the caller's own
 * institution.
 */
export async function addSampleListings(): Promise<ActionState> {
  const { profile } = await requireProfile();

  if (!localInboxUrl()) {
    return fail("Sample listings can only be added on a local install.");
  }

  try {
    await seedDemoFor(profile.institution);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not add them.");
  }

  revalidatePath("/browse");
  revalidatePath("/home");
  return { error: null };
}

export async function removeSampleListings(): Promise<ActionState> {
  const { profile } = await requireProfile();

  if (!localInboxUrl()) {
    return fail("Sample listings can only be changed on a local install.");
  }

  try {
    await removeDemoFor(profile.institution);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not remove them.");
  }

  revalidatePath("/browse");
  revalidatePath("/home");
  return { error: null };
}
