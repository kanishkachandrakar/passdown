"use client";

import { useActionState, useState, type ChangeEvent } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { releaseItem } from "@/lib/actions/items";
import { NO_ERROR } from "@/lib/actions/shared";
import type { PickupLocation } from "@/lib/campus";
import { createClient } from "@/lib/supabase/client";
import type { ItemCondition } from "@/lib/types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function defaultAvailableUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

export function ReleaseForm({
  userId,
  categories,
  conditions,
  pickupLocations,
  defaultPickup,
}: {
  userId: string;
  categories: string[];
  conditions: { value: ItemCondition; label: string }[];
  pickupLocations: PickupLocation[];
  defaultPickup: string;
}) {
  const [state, action] = useActionState(releaseItem, NO_ERROR);
  const [isFree, setIsFree] = useState(true);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoStatus("That photo is over 5 MB. Try a smaller one.");
      return;
    }

    setUploading(true);
    setPhotoStatus("Uploading…");

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // The storage policy only allows writing into a folder named after your
    // own user id, so the path is not cosmetic.
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("item-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    setUploading(false);

    if (error) {
      setPhotoStatus(`Upload failed: ${error.message}`);
      return;
    }

    const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setPhotoStatus("Photo added.");
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="photo_url" value={photoUrl} />

      <Field label="What is it?" htmlFor="name">
        <Input
          id="name"
          name="name"
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

      <Field label="Condition" htmlFor="condition">
        <Select id="condition" name="condition" required defaultValue="good">
          {conditions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-ink">
              Giving it away free
            </span>
            <span className="block text-xs text-faint">
              Free items match more needs and go fastest.
            </span>
          </span>
          <input
            type="checkbox"
            name="is_free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-6 w-6 shrink-0 accent-accent"
          />
        </label>

        {!isFree ? (
          <div className="mt-3 border-t border-line pt-3">
            <Field
              label="Price"
              hint="Fixed price, no haggling. Money changes hands in person — Passdown doesn't touch it."
              htmlFor="price"
            >
              <Input
                id="price"
                name="price"
                type="number"
                inputMode="numeric"
                min={1}
                step={50}
                required
                placeholder="1500"
              />
            </Field>
          </div>
        ) : null}
      </div>

      <Field label="Where's the handover?" htmlFor="pickup_location">
        <Select
          id="pickup_location"
          name="pickup_location"
          required
          defaultValue={defaultPickup}
        >
          {pickupLocations.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Available until"
        hint="After this it drops off the board automatically."
        htmlFor="available_until"
      >
        <Input
          id="available_until"
          name="available_until"
          type="date"
          required
          min={today}
          defaultValue={defaultAvailableUntil()}
        />
      </Field>

      <Field label="Photo" hint="Optional, but it roughly doubles the chance someone takes it." htmlFor="photo">
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={uploadPhoto}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-strong"
        />
        {photoStatus ? (
          <p className="mt-1.5 text-xs text-faint">{photoStatus}</p>
        ) : null}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="The item you're releasing"
            className="mt-2 h-28 w-28 rounded-xl border border-line object-cover"
          />
        ) : null}
      </Field>

      <Field label="Anything worth knowing?" hint="Optional." htmlFor="description">
        <Textarea
          id="description"
          name="description"
          maxLength={300}
          placeholder="Works fine, door seal is a bit loose."
        />
      </Field>

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <SubmitButton size="lg" full disabled={uploading} pendingLabel="Releasing…">
        Release it
      </SubmitButton>
    </form>
  );
}
