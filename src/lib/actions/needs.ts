"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/session";
import { CATEGORIES, CONDITIONS, type ItemCondition } from "@/lib/types";
import { fail, requiredText, type ActionState } from "./shared";

export async function createNeed(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile, supabase } = await requireProfile();

  const itemName = requiredText(formData.get("item_name"), "Item", 80);
  if (!itemName.ok) return fail(itemName.error);

  const category = String(formData.get("category") ?? "");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return fail("Pick a category.");
  }

  const freeOnly = formData.get("free_only") === "on";

  let maxPrice: number | null = null;
  if (!freeOnly) {
    const raw = String(formData.get("max_price") ?? "").trim();
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return fail("Max price must be a number.");
      }
      maxPrice = parsed;
    }
  }

  const neededByRaw = String(formData.get("needed_by") ?? "").trim();
  let neededBy: string | null = null;
  if (neededByRaw) {
    const today = new Date().toISOString().slice(0, 10);
    if (neededByRaw < today) return fail("Pick a date in the future.");
    neededBy = neededByRaw;
  }

  const conditionRaw = String(formData.get("preferred_condition") ?? "");
  const preferredCondition = CONDITIONS.some((c) => c.value === conditionRaw)
    ? (conditionRaw as ItemCondition)
    : null;

  const { error } = await supabase.from("needs").insert({
    user_id: profile.id,
    item_name: itemName.value,
    category,
    free_only: freeOnly,
    max_price: maxPrice,
    needed_by: neededBy,
    preferred_condition: preferredCondition,
  });

  if (error) return fail(error.message);

  revalidatePath("/home");
  redirect("/home?posted=need");
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

  await supabase
    .from("needs")
    .update({ status: "open", needed_by: newDate.toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("user_id", profile.id);

  revalidatePath("/home");
  revalidatePath(`/needs/${id}`);
}
