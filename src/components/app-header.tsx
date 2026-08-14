import Link from "next/link";

import { areaLabel } from "@/lib/campus";
import type { Profile } from "@/lib/types";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3 sm:max-w-lg">
        <Link href="/home" className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-tight text-ink">
            Passdown
          </p>
          <p className="truncate text-[12px] leading-tight text-faint">
            Your campus already has one.
          </p>
        </Link>

        <Link
          href="/profile"
          className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1.5 text-right"
        >
          <span className="block text-[11px] leading-tight text-faint">
            {profile.institution}
          </span>
          <span className="block text-[12px] font-medium leading-tight text-ink">
            {areaLabel(profile.campus_area) ?? "Set your block"}
          </span>
        </Link>
      </div>
    </header>
  );
}
