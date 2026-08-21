"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button, Notice } from "@/components/ui";
import { setBlock } from "@/lib/actions/messages";
import { NO_ERROR } from "@/lib/actions/shared";

export function BlockButton({
  otherId,
  name,
  blocked,
}: {
  otherId: string;
  name: string;
  blocked: boolean;
}) {
  const [state, action] = useActionState(setBlock, NO_ERROR);
  const [confirming, setConfirming] = useState(false);

  if (blocked) {
    return (
      <form action={action}>
        <input type="hidden" name="other_id" value={otherId} />
        <input type="hidden" name="blocked" value="false" />
        {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
        <SubmitButton variant="secondary" size="sm" pendingLabel="Unblocking…">
          Unblock {name}
        </SubmitButton>
      </form>
    );
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        Block {name}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4">
      <p className="text-sm font-medium text-danger">Block {name}?</p>
      <p className="mt-1 text-sm leading-relaxed text-danger/90">
        Neither of you will be able to send messages. They aren&rsquo;t told,
        and you can undo it here at any time.
      </p>

      {state.error ? (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <form action={action} className="flex-1">
          <input type="hidden" name="other_id" value={otherId} />
          <input type="hidden" name="blocked" value="true" />
          <SubmitButton variant="danger" size="md" full pendingLabel="Blocking…">
            Block
          </SubmitButton>
        </form>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
