"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CAMPUS_AREAS } from "@/lib/campus";
import { requireProfile } from "@/lib/session";
import { fail, requiredText, type ActionState } from "./shared";

export async function saveProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile, supabase } = await requireProfile();

  const name = requiredText(formData.get("name"), "Name", 60);
  if (!name.ok) return fail(name.error);

  const campusArea = String(formData.get("campus_area") ?? "");
  if (!CAMPUS_AREAS.some((a) => a.id === campusArea)) {
    return fail("Pick the block or building you're based in.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name: name.value, campus_area: campusArea })
    .eq("id", profile.id);

  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  redirect(String(formData.get("next") || "/home"));
}

export async function signOut() {
  const { supabase } = await requireProfile();
  await supabase.auth.signOut();
  redirect("/");
}
