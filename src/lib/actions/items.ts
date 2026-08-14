"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { areaOfPickup, PICKUP_LOCATIONS } from "@/lib/campus";
import { matchItemToNeeds, type Need as MatchNeed } from "@/lib/matching";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, CONDITIONS, type ItemCondition } from "@/lib/types";
import { fail, requiredText, type ActionState } from "./shared";

export async function releaseItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile, supabase } = await requireProfile();

  const name = requiredText(formData.get("name"), "Item name", 80);
  if (!name.ok) return fail(name.error);

  const category = String(formData.get("category") ?? "");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return fail("Pick a category.");
  }

  const conditionRaw = String(formData.get("condition") ?? "good");
  if (!CONDITIONS.some((c) => c.value === conditionRaw)) {
    return fail("Pick a condition.");
  }
  const condition = conditionRaw as ItemCondition;

  const isFree = formData.get("is_free") !== "off";
  let price = 0;
  if (!isFree) {
    price = Number(String(formData.get("price") ?? "").trim());
    if (!Number.isFinite(price) || price <= 0) {
      return fail("Set a price above zero, or mark the item free.");
    }
  }

  const pickupLocation = String(formData.get("pickup_location") ?? "");
  if (!PICKUP_LOCATIONS.some((p) => p.id === pickupLocation)) {
    return fail("Pick where the handover happens.");
  }

  const availableUntil = String(formData.get("available_until") ?? "").trim();
  const today = new Date().toISOString().slice(0, 10);
  if (!availableUntil) return fail("Set how long the item is available.");
  if (availableUntil < today) return fail("Pick a date in the future.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      owner_id: profile.id,
      name: name.value,
      category,
      condition,
      is_free: isFree,
      price,
      description,
      photo_url: photoUrl,
      pickup_location: pickupLocation,
      available_until: availableUntil,
    })
    .select()
    .single();

  if (error || !item) return fail(error?.message ?? "Could not save that item.");

  await matchNewItem(item.id);

  revalidatePath("/home");
  revalidatePath("/browse");
  redirect(`/release/${item.id}/done`);
}

/**
 * Score a freshly released item against every open need on campus.
 *
 * Runs under the service role because other students' needs are not readable
 * by the releaser — RLS keeps `needs` private and always will. What comes back
 * out of here is match rows and a count, never anyone else's need.
 */
export async function matchNewItem(itemId: string) {
  const admin = createAdminClient();

  const { data: item } = await admin
    .from("items")
    .select("*, owner:profiles!items_owner_id_fkey(institution)")
    .eq("id", itemId)
    .single();

  if (!item) return 0;

  const institution = (item.owner as { institution: string } | null)?.institution;
  if (!institution) return 0;

  // open needs, this campus only, other students only
  const { data: needRows } = await admin
    .from("needs")
    .select("*, profiles!inner(campus_area, institution)")
    .eq("status", "open")
    .neq("user_id", item.owner_id)
    .eq("profiles.institution", institution);

  if (!needRows?.length) return 0;

  const needs: MatchNeed[] = needRows.map((row) => {
    const owner = row.profiles as unknown as { campus_area: string | null };
    return {
      id: row.id,
      user_id: row.user_id,
      item_name: row.item_name,
      category: row.category,
      free_only: row.free_only,
      max_price: row.max_price,
      needed_by: row.needed_by,
      preferred_condition: row.preferred_condition,
      campus_area: owner?.campus_area ?? null,
    };
  });

  const results = matchItemToNeeds(
    {
      id: item.id,
      owner_id: item.owner_id,
      name: item.name,
      category: item.category,
      condition: item.condition,
      is_free: item.is_free,
      price: Number(item.price),
      pickup_location: item.pickup_location,
      available_until: item.available_until,
    },
    needs,
    areaOfPickup(item.pickup_location)
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

/** Take an item off the board without deleting the history behind it. */
export async function withdrawItem(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const id = String(formData.get("item_id") ?? "");

  await supabase
    .from("items")
    .update({ status: "expired" })
    .eq("id", id)
    .eq("owner_id", profile.id)
    .eq("status", "available");

  revalidatePath("/profile");
  revalidatePath("/browse");
  revalidatePath(`/items/${id}`);
}

/**
 * Relist something whose window ran out. Students keep the same item across a
 * whole year — making them retype it every term is how an app stops being used.
 */
export async function relistItem(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const id = String(formData.get("item_id") ?? "");

  const until = new Date();
  until.setDate(until.getDate() + 30);

  const { data } = await supabase
    .from("items")
    .update({ status: "available", available_until: until.toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("owner_id", profile.id)
    .eq("status", "expired")
    .select("id")
    .maybeSingle();

  if (data) await matchNewItem(id);

  revalidatePath("/profile");
  revalidatePath("/browse");
  revalidatePath(`/items/${id}`);
}
