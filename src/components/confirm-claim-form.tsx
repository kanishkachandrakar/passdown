"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { confirmClaim } from "@/lib/actions/claims";
import { NO_ERROR } from "@/lib/actions/shared";

export function ConfirmClaimForm({ reservationId }: { reservationId: string }) {
  const [state, action] = useActionState(confirmClaim, NO_ERROR);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="reservation_id" value={reservationId} />

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel="Confirming…">
        Confirm — I&rsquo;ll collect it
      </SubmitButton>
    </form>
  );
}
