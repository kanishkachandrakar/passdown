"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { openConversation } from "@/lib/actions/messages";
import { NO_ERROR } from "@/lib/actions/shared";

/**
 * Opens (or reuses) the thread with another student.
 *
 * `itemId` ties the conversation to one listing, so "is this still going?"
 * lands with the thing it's about attached.
 */
export function MessageButton({
  otherId,
  itemId,
  label = "Message",
  variant = "secondary",
}: {
  otherId: string;
  itemId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "soft";
}) {
  const [state, action] = useActionState(openConversation, NO_ERROR);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="other_id" value={otherId} />
      {itemId ? <input type="hidden" name="item_id" value={itemId} /> : null}

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton variant={variant} size="md" full pendingLabel="Opening…">
        {label}
      </SubmitButton>
    </form>
  );
}
