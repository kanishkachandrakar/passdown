"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { claimItem } from "@/lib/actions/claims";
import { NO_ERROR } from "@/lib/actions/shared";

/**
 * The button is the easy part. The guarantee behind it lives in Postgres:
 * `claim_item` takes a row lock, re-checks the status inside the transaction,
 * and a unique partial index allows exactly one active reservation per item.
 * If this component were the only thing standing between two students, two
 * tabs would both "win" — so it isn't.
 */
export function ClaimForm({ itemId }: { itemId: string }) {
  const [state, action] = useActionState(claimItem, NO_ERROR);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="item_id" value={itemId} />

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel="Claiming…">
        Claim it
      </SubmitButton>
    </form>
  );
}
