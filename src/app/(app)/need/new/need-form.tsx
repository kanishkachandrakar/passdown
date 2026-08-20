"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select } from "@/components/ui";
import { createNeed } from "@/lib/actions/needs";
import { NO_ERROR } from "@/lib/actions/shared";
import type { ItemCondition } from "@/lib/types";

/** Default the needed-by date a fortnight out — the common case. */
function defaultNeededBy() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function NeedForm({
  categories,
  conditions,
}: {
  categories: string[];
  conditions: { value: ItemCondition; label: string }[];
}) {
  const [state, action] = useActionState(createNeed, NO_ERROR);
  const [freeOnly, setFreeOnly] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="What are you after?" htmlFor="item_name">
        <Input
          id="item_name"
          name="item_name"
          required
          maxLength={80}
          autoFocus
          placeholder="Mini fridge"
        />
      </Field>

      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" required defaultValue="Dorm">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-ink">Free only</span>
            <span className="block text-xs text-faint">
              Off if you&rsquo;re willing to pay something.
            </span>
          </span>
          <input
            type="checkbox"
            name="free_only"
            checked={freeOnly}
            onChange={(e) => setFreeOnly(e.target.checked)}
            className="h-6 w-6 shrink-0 accent-accent"
          />
        </label>

        {!freeOnly ? (
          <div className="mt-3 border-t border-line pt-3">
            <Field label="Most you'd pay" hint="Leave blank for no limit." htmlFor="max_price">
              <Input
                id="max_price"
                name="max_price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="40"
              />
            </Field>
          </div>
        ) : null}
      </div>

      <Field label="Needed by" hint="We won't match items that lapse before this." htmlFor="needed_by">
        <Input
          id="needed_by"
          name="needed_by"
          type="date"
          min={today}
          defaultValue={defaultNeededBy()}
        />
      </Field>

      <Field label="Condition you'd accept" hint="Optional." htmlFor="preferred_condition">
        <Select id="preferred_condition" name="preferred_condition" defaultValue="">
          <option value="">Any condition</option>
          {conditions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} or better
            </option>
          ))}
        </Select>
      </Field>

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel="Posting…">
        Post this need
      </SubmitButton>
    </form>
  );
}
