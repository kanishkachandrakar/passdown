/** What every form action hands back to `useActionState`. */
export type ActionState = { error: string | null };

export const NO_ERROR: ActionState = { error: null };

export function fail(message: string): ActionState {
  return { error: message };
}

/**
 * Postgres exceptions raised by our RPCs come back as bare identifiers
 * (`item_unavailable`). Turn them into something a student can act on.
 */
const RPC_MESSAGES: Record<string, string> = {
  item_not_found: "That item is no longer listed.",
  item_unavailable:
    "Someone else claimed this first. It's off the board — that's the point.",
  item_expired: "This listing has lapsed. The owner set it to end before today.",
  cannot_claim_own_item: "This is your own item.",
  reservation_not_found: "That reservation no longer exists.",
  not_your_reservation: "That reservation belongs to someone else.",
  reservation_not_active: "This reservation is already finished.",
  reservation_expired:
    "Your ten minutes ran out, so the item went back to available.",
  handoff_not_found: "That handoff no longer exists.",
  not_a_participant: "You're not part of this handoff.",
};

export function readableRpcError(message: string): string {
  for (const [code, text] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(code)) return text;
  }
  if (message.includes("one_active_reservation_per_item")) {
    return RPC_MESSAGES.item_unavailable;
  }
  return "Something went wrong. Try that again.";
}

export function requiredText(
  value: FormDataEntryValue | null,
  field: string,
  max = 120
): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { ok: false, error: `${field} is required.` };
  if (text.length > max) {
    return { ok: false, error: `${field} must be under ${max} characters.` };
  }
  return { ok: true, value: text };
}
