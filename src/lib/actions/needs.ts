"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { areaOfPickup } from "@/lib/campus";
import { matchNeedToItems } from "@/lib/matching";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, CONDITIONS, type ItemCondition } from "@/lib/types";
import { fail, requiredText, type ActionState } from "./shared";

/**
 * Score a newly posted need against everything already on the board.
 *
 * The mirror of matchNewItem. Runs under the service role because the items
 * belong to other students and the campus-scoping check needs their
 * institution; what comes back out is match rows and a count, never anyone
 * else's data.
 */
export async function matchNewNeed(needId: string) {
  const admin = createAdminClient();

  const { data: need } = await admin
    .from("needs")
    .select("*, profiles!inner(campus_area, institution)")
    .eq("id", needId)
    .single();

  if (!need) return 0;

  const owner = need.profiles as unknown as {
    campus_area: string | null;
    institution: string;
  };

  const today = new Date().toISOString().slice(0, 10);

  const { data: itemRows } = await admin
    .from("items")
    .select("*, profiles!inner(institution)")
    .eq("status", "available")
    .gte("available_until", today)
    .neq("owner_id", need.user_id)
    .eq("profiles.institution", owner.institution);

  if (!itemRows?.length) return 0;

  const items = itemRows.map((row) => ({
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    category: row.category,
    condition: row.condition,
    is_free: row.is_free,
    price: Number(row.price),
    pickup_location: row.pickup_location,
    available_until: row.available_until,
  }));

  const results = matchNeedToItems(
    {
      id: need.id,
      user_id: need.user_id,
      item_name: need.item_name,
      category: need.category,
      free_only: need.free_only,
      max_price: need.max_price,
      needed_by: need.needed_by,
      preferred_condition: need.preferred_condition,
      campus_area: owner.campus_area,
    },
    items,
    (item) => areaOfPickup(item.pickup_location)
  );

  if (!results.length) return 0;

  await admin.from("matches").upsert(
    results.map((m) => ({
      item_id: m.item_id,
      need_id: m.need_id,
      match_score: m.match_score,
      reasons: m.reasons,
    })),
    { onConflict: "item_id,need_id" }
  );

  return results.length;
}

/** The four fields a need is made of, validated. Shared by create and edit. */
function readNeedFields(formData: FormData) {
  const itemName = requiredText(formData.get("item_name"), "Item", 80);
  if (!itemName.ok) return { ok: false as const, error: itemName.error };

  const category = String(formData.get("category") ?? "");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { ok: false as const, error: "Pick a category." };
  }

  const freeOnly = formData.get("free_only") === "on";

  let maxPrice: number | null = null;
  if (!freeOnly) {
    const raw = String(formData.get("max_price") ?? "").trim();
    if (raw) {
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        return { ok: false as const, error: "Max price must be a number." };
      }
      maxPrice = price;
    }
  }

  const neededByRaw = String(formData.get("needed_by") ?? "").trim();
  let neededBy: string | null = null;
  if (neededByRaw) {
    const today = new Date().toISOString().slice(0, 10);
    if (neededByRaw < today)
      return { ok: false as const, error: "Pick a date in the future." };
    neededBy = neededByRaw;
  }

  const conditionRaw = String(formData.get("preferred_condition") ?? "");
  const preferredCondition = CONDITIONS.some((c) => c.value === conditionRaw)
    ? (conditionRaw as ItemCondition)
    : null;

  return {
    ok: true as const,
    values: {
      item_name: itemName.value,
      category,
      free_only: freeOnly,
      max_price: maxPrice,
      needed_by: neededBy,
      preferred_condition: preferredCondition,
    },
  };
}

export async function createNeed(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile, supabase } = await requireProfile();

  const parsed = readNeedFields(formData);
  if (!parsed.ok) return fail(parsed.error);

  const { data: need, error } = await supabase
    .from("needs")
    .insert({ user_id: profile.id, ...parsed.values })
    .select()
    .single();

  if (error || !need) return fail(error?.message ?? "Could not save that need.");

  // Supply often arrives before demand, so check what is already on the board
  // rather than only watching for what turns up later.
  const found = await matchNewNeed(need.id);

  revalidatePath("/home");

  // If it matched something now, that is the answer to the question they just
  // asked — take them straight to it rather than back to a list.
  redirect(found > 0 ? `/needs/${need.id}?fresh=1` : "/home?posted=need");
}

/**
 * Edit a need you already posted.
 *
 * Changing the criteria invalidates the matches that were scored against the
 * old ones, so they are cleared and rebuilt rather than left to accumulate —
 * a need edited from "free only" to "under $40" should gain matches, and one
 * edited the other way should lose them.
 *
 * Only while it is still looking: a need that already led to a claim is part
 * of a handoff's history by then.
 */
export async function updateNeed(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile, supabase } = await requireProfile();
  const id = String(formData.get("need_id") ?? "");

  const parsed = readNeedFields(formData);
  if (!parsed.ok) return fail(parsed.error);

  const { data: updated, error } = await supabase
    .from("needs")
    .update({ ...parsed.values, status: "open" })
    .eq("id", id)
    .eq("user_id", profile.id)
    .in("status", ["open", "expired"])
    .select("id")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!updated) {
    return fail("That need can no longer be edited — it's already been matched.");
  }

  const admin = createAdminClient();
  await admin.from("matches").delete().eq("need_id", id);
  await matchNewNeed(id);

  revalidatePath("/home");
  revalidatePath(`/needs/${id}`);
  redirect(`/needs/${id}?updated=1`);
}

export async function cancelNeed(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const id = String(formData.get("need_id") ?? "");

  await supabase
    .from("needs")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", profile.id);

  revalidatePath("/home");
  revalidatePath(`/needs/${id}`);
}

/**
 * Needs go stale — a student who asked for a fridge in August is still on
 * Passdown in October. Rather than silently deleting them, an expired need can
 * be pushed forward without retyping anything.
 */
export async function extendNeed(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const id = String(formData.get("need_id") ?? "");

  const newDate = new Date();
  newDate.setDate(newDate.getDate() + 30);

  const { data: reopened } = await supabase
    .from("needs")
    .update({ status: "open", needed_by: newDate.toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("user_id", profile.id)
    .select("id")
    .maybeSingle();

  // A need that has been sitting expired may well have been answered since.
  if (reopened) await matchNewNeed(id);

  revalidatePath("/home");
  revalidatePath(`/needs/${id}`);
}
