"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button, Notice } from "@/components/ui";
import { cancelHandoff } from "@/lib/actions/claims";
import { NO_ERROR } from "@/lib/actions/shared";

/**
 * Two taps, on purpose. Cancelling puts the item back in front of everyone
 * else and reopens the other student's need — not something to do by brushing
 * a button on the way past.
 */
export function CancelHandoffForm({
  handoffId,
  otherName,
}: {
  handoffId: string;
  otherName: string;
}) {
  const [state, action] = useActionState(cancelHandoff, NO_ERROR);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <>
        {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
        <Button
          variant="ghost"
          size="sm"
          full
          onClick={() => setConfirming(true)}
          type="button"
        >
          I can&rsquo;t make it — cancel this pickup
        </Button>
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4">
      <p className="text-sm font-medium text-danger">Cancel this pickup?</p>
      <p className="mt-1 text-sm leading-relaxed text-danger/90">
        {otherName} will see it was called off, the item goes back on the board
        for anyone to claim, and your need reopens. Better than not turning up —
        this isn&rsquo;t counted as a missed pickup.
      </p>

      {state.error ? (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <form action={action} className="flex-1">
          <input type="hidden" name="handoff_id" value={handoffId} />
          <SubmitButton variant="danger" size="md" full pendingLabel="Cancelling…">
            Yes, cancel it
          </SubmitButton>
        </form>
        <Button
          variant="secondary"
          size="md"
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1"
        >
          Keep it
        </Button>
      </div>
    </div>
  );
}
