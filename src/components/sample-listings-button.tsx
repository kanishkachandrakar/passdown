"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { addSampleListings } from "@/lib/actions/demo";
import { NO_ERROR } from "@/lib/actions/shared";

/**
 * The non-technical way to fill an empty Browse. Same rows the seed script
 * creates, one tap, no terminal.
 */
export function SampleListingsButton({ institution }: { institution: string }) {
  const [state, action] = useActionState(async () => addSampleListings(), NO_ERROR);

  return (
    <div className="mt-3 rounded-2xl border border-accent-line wash-soft p-4 text-center">
      <p className="text-sm font-medium text-ink">Nothing on this campus yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
        Listings only show to students at the same institution, so a brand new
        campus starts empty. Add a dozen sample ones for {institution} to see
        how it looks with things on it.
      </p>

      {state.error ? (
        <div className="mt-3 text-left">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}

      <form action={action} className="mt-3 flex justify-center">
        <SubmitButton size="md" pendingLabel="Adding…">
          Add sample listings
        </SubmitButton>
      </form>

      <p className="mt-2 text-[12px] text-faint">
        They&rsquo;re marked <strong>Sample</strong>, and the Demo / Real switch
        at the top removes them again.
      </p>
    </div>
  );
}
