"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { VIEW_MODE_COOKIE, type ViewMode } from "@/lib/view-mode";

export async function setViewMode(formData: FormData) {
  const requested = String(formData.get("mode") ?? "");
  const mode: ViewMode = requested === "user" ? "user" : "demo";

  const store = await cookies();
  store.set(VIEW_MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
