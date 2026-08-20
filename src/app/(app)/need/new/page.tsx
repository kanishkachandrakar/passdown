import Link from "next/link";

import { CATEGORIES, CONDITIONS } from "@/lib/types";
import { NeedForm } from "./need-form";

export const metadata = { title: "Post a need — Passdown" };

export default function NewNeedPage() {
  return (
    <div className="mx-auto max-w-lg pd-in">
      <Link href="/home" className="text-sm text-muted hover:text-ink">
        ← Home
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        What do you need?
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
        Four fields. It waits in the background and pings you when a match shows
        up — you don&rsquo;t have to keep checking.
      </p>

      <NeedForm categories={[...CATEGORIES]} conditions={CONDITIONS} />
    </div>
  );
}
