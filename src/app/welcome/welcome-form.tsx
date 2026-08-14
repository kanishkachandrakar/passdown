"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select } from "@/components/ui";
import { saveProfile } from "@/lib/actions/profile";
import { NO_ERROR } from "@/lib/actions/shared";
import type { CampusArea } from "@/lib/campus";

export function WelcomeForm({
  areas,
  defaultName,
  defaultArea,
}: {
  areas: CampusArea[];
  defaultName: string;
  defaultArea: string | null;
}) {
  const [state, action] = useActionState(saveProfile, NO_ERROR);

  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="Your name" hint="Shown to the other student at handover." htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          autoComplete="name"
          defaultValue={defaultName}
        />
      </Field>

      <Field
        label="Where you're based"
        hint="Your residence block, or the building you're on campus most."
        htmlFor="campus_area"
      >
        <Select id="campus_area" name="campus_area" required defaultValue={defaultArea ?? ""}>
          <option value="" disabled>
            Pick a block or building
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.label}
            </option>
          ))}
        </Select>
      </Field>

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full pendingLabel="Saving…">
        Start using Passdown
      </SubmitButton>
    </form>
  );
}
