"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/session";
import { fail, readableRpcError, type ActionState } from "./shared";

/**
 * Open the thread with another student and go to it.
 *
 * Whether you're allowed to — same campus, not blocked, not yourself — is
 * decided by `start_conversation` in Postgres, not here. Reusing an existing
 * thread rather than making a second one is handled by a unique index on the
 * (pair, item) triple, so tapping Message twice can't fork the conversation.
 */
export async function openConversation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();

  const other = String(formData.get("other_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "") || undefined;

  const { data, error } = await supabase.rpc("start_conversation", {
    p_other: other,
    p_item: itemId,
  });

  if (error) return fail(readableRpcError(error.message));

  const conversation = Array.isArray(data) ? data[0] : data;
  if (!conversation) return fail("Could not open that conversation.");

  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();

  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!body.trim()) return { error: null }; // empty submit, nothing to say

  const { error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });

  if (error) return fail(readableRpcError(error.message));

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { error: null };
}

export async function markRead(conversationId: string) {
  const { supabase } = await requireProfile();
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
}

/** Blocking is mutual in effect: neither side can write to the other after it. */
export async function setBlock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await requireProfile();

  const other = String(formData.get("other_id") ?? "");
  const blocked = formData.get("blocked") === "true";

  const { error } = await supabase.rpc("set_block", {
    p_other: other,
    p_blocked: blocked,
  });

  if (error) return fail(readableRpcError(error.message));

  revalidatePath("/messages", "layout");
  revalidatePath(`/students/${other}`);
  return { error: null };
}
