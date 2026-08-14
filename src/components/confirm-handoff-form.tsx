"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { confirmHandoff } from "@/lib/actions/claims";
import { NO_ERROR } from "@/lib/actions/shared";

export function ConfirmHandoffForm({
  handoffId,
  isGiver,
}: {
  handoffId: string;
  isGiver: boolean;
}) {
  const [state, action] = useActionState(confirmHandoff, NO_ERROR);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="handoff_id" value={handoffId} />

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel="Confirming…">
        {isGiver ? "I handed it over" : "I collected it"}
      </SubmitButton>
    </form>
  );
}
