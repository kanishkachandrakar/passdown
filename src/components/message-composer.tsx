"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice, Textarea } from "@/components/ui";
import { sendMessage } from "@/lib/actions/messages";
import { NO_ERROR } from "@/lib/actions/shared";

export function MessageComposer({
  conversationId,
  name,
}: {
  conversationId: string;
  name: string;
}) {
  const [state, action] = useActionState(sendMessage, NO_ERROR);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the message is away, so the next one starts empty.
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="conversation_id" value={conversationId} />

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <Textarea
        name="body"
        required
        maxLength={2000}
        rows={2}
        placeholder={`Message ${name}…`}
        aria-label="Your message"
      />

      <SubmitButton size="md" full pendingLabel="Sending…">
        Send
      </SubmitButton>
    </form>
  );
}
