"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select } from "@/components/ui";
import type { ActionState } from "@/lib/actions/shared";
import { NO_ERROR } from "@/lib/actions/shared";
import type { ItemCondition } from "@/lib/types";

/** Default the needed-by date a fortnight out — the common case. */
function defaultNeededBy() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export type NeedDefaults = {
  id?: string;
  item_name?: string;
  category?: string;
  free_only?: boolean;
  max_price?: number | null;
  needed_by?: string | null;
  preferred_condition?: ItemCondition | null;
};

/**
 * One form for posting a need and for editing one.
 *
 * Deliberately shared: a need you can create with four fields but only edit by
 * deleting and retyping is the kind of thing that quietly stops people
 * adjusting a price limit they got slightly wrong.
 */
export function NeedForm({
  categories,
  conditions,
  action: serverAction,
  defaults,
  submitLabel = "Post this need",
  pendingLabel = "Posting…",
}: {
  categories: string[];
  conditions: { value: ItemCondition; label: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: NeedDefaults;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, action] = useActionState(serverAction, NO_ERROR);
  const [freeOnly, setFreeOnly] = useState(defaults?.free_only ?? false);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="mt-6 space-y-4">
      {defaults?.id ? (
        <input type="hidden" name="need_id" value={defaults.id} />
      ) : null}

      <Field label="What are you after?" htmlFor="item_name">
        <Input
          id="item_name"
          name="item_name"
          required
          maxLength={80}
          autoFocus
          placeholder="Mini fridge"
          defaultValue={defaults?.item_name}
        />
      </Field>

      <Field label="Category" htmlFor="category">
        <Select
          id="category"
          name="category"
          required
          defaultValue={defaults?.category ?? "Dorm"}
        >
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
              On means free items only — anything with a price is hidden.
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
            <Field
              label="Most you'd pay"
              hint="Leave blank for no limit."
              htmlFor="max_price"
            >
              <Input
                id="max_price"
                name="max_price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="40"
                defaultValue={defaults?.max_price ?? undefined}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <Field
        label="Needed by"
        hint="We won't match items that lapse before this."
        htmlFor="needed_by"
      >
        <Input
          id="needed_by"
          name="needed_by"
          type="date"
          min={today}
          defaultValue={defaults?.needed_by ?? defaultNeededBy()}
        />
      </Field>

      <Field label="Condition you'd accept" hint="Optional." htmlFor="preferred_condition">
        <Select
          id="preferred_condition"
          name="preferred_condition"
          defaultValue={defaults?.preferred_condition ?? ""}
        >
          <option value="">Any condition</option>
          {conditions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} or better
            </option>
          ))}
        </Select>
      </Field>

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
