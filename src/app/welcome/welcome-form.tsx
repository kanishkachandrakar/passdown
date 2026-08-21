"use client";

import { useActionState, useState, type ChangeEvent } from "react";

import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select } from "@/components/ui";
import { saveProfile } from "@/lib/actions/profile";
import { NO_ERROR } from "@/lib/actions/shared";
import type { CampusArea } from "@/lib/campus";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function WelcomeForm({
  areas,
  userId,
  defaultName,
  defaultArea,
  defaultAvatar,
}: {
  areas: CampusArea[];
  userId: string;
  defaultName: string;
  defaultArea: string | null;
  defaultAvatar: string | null;
}) {
  const [state, action] = useActionState(saveProfile, NO_ERROR);
  const [name, setName] = useState(defaultName);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar ?? "");
  const [avatarNote, setAvatarNote] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarNote("That picture is over 3 MB. Try a smaller one.");
      return;
    }

    setUploading(true);
    setAvatarNote("Uploading…");

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // The storage policy only allows writing into a folder named after your
    // own user id, so the path is not cosmetic.
    const path = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    setUploading(false);

    if (error) {
      setAvatarNote(`Upload failed: ${error.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setAvatarNote("Picture added.");
  }

  return (
    <form action={action} className="mt-7 space-y-4">
      <input type="hidden" name="avatar_url" value={avatarUrl} />

      <Field
        label="Photo"
        hint="Optional. It helps the other student spot you in a busy lobby."
        htmlFor="avatar"
      >
        <div className="flex items-center gap-3">
          <Avatar name={name || "?"} url={avatarUrl || null} size="lg" />
          <div className="min-w-0 flex-1">
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-strong"
            />
            {avatarNote ? (
              <p className="mt-1.5 text-xs text-faint">{avatarNote}</p>
            ) : null}
          </div>
        </div>
      </Field>

      <Field label="Your name" hint="Shown to the other student at handover." htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      <SubmitButton size="lg" full disabled={uploading} pendingLabel="Saving…">
        Start using Passdown
      </SubmitButton>
    </form>
  );
}
