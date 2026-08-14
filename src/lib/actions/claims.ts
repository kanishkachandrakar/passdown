"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/session";
import { fail, readableRpcError, type ActionState } from "./shared";

/**
 * Claim an item.
 *
 * All this does is call the `claim_item` RPC. The decision about who gets the
 * item is made inside one Postgres transaction holding a row lock, backed by a
 * unique partial index that permits one active reservation per item. Two tabs
 * pressing this at the same moment produce exactly one reservation and one
 * loser who is told so plainly.
 */
export async function claimItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();
  const itemId = String(formData.get("item_id") ?? "");

  const { data, error } = await supabase.rpc("claim_item", { p_item_id: itemId });

  if (error) {
    revalidatePath(`/items/${itemId}`);
    return fail(readableRpcError(error.message));
  }

  const reservation = Array.isArray(data) ? data[0] : data;
  if (!reservation) return fail("Could not hold that item. Try again.");

  revalidatePath("/home");
  revalidatePath("/browse");
  revalidatePath(`/items/${itemId}`);
  redirect(`/reservations/${reservation.id}`);
}

export async function confirmClaim(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();
  const reservationId = String(formData.get("reservation_id") ?? "");

  const { data, error } = await supabase.rpc("confirm_claim", {
    p_reservation_id: reservationId,
  });

  if (error) {
    revalidatePath(`/reservations/${reservationId}`);
    return fail(readableRpcError(error.message));
  }

  const handoff = Array.isArray(data) ? data[0] : data;
  if (!handoff) return fail("Could not confirm that claim. Try again.");

  revalidatePath("/home");
  revalidatePath("/profile");
  redirect(`/handoffs/${handoff.id}`);
}

export async function confirmHandoff(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();
  const handoffId = String(formData.get("handoff_id") ?? "");

  const { error } = await supabase.rpc("confirm_handoff", {
    p_handoff_id: handoffId,
  });

  if (error) return fail(readableRpcError(error.message));

  revalidatePath(`/handoffs/${handoffId}`);
  revalidatePath("/home");
  revalidatePath("/profile");
  return { error: null };
}

/** Give the item back before the ten minutes are up. */
export async function releaseReservation(formData: FormData) {
  const { supabase } = await requireProfile();
  const reservationId = String(formData.get("reservation_id") ?? "");

  const { data: reservation } = await supabase
    .from("reservations")
    .select("item_id")
    .eq("id", reservationId)
    .maybeSingle();

  await supabase.rpc("cancel_reservation", { p_reservation_id: reservationId });

  revalidatePath("/home");
  revalidatePath("/browse");
  redirect(reservation ? `/items/${reservation.item_id}` : "/home");
}
