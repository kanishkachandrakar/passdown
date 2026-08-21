import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { HeaderNav } from "@/components/app-nav";
import { ViewModeSwitch } from "@/components/view-mode-switch";
import { areaLabel } from "@/lib/campus";
import type { Profile } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function AppHeader({
  profile,
  viewMode,
  showViewSwitch,
  unread,
}: {
  profile: Profile;
  viewMode: ViewMode;
  /** Hidden when there is no sample data at all — nothing to switch between. */
  showViewSwitch: boolean;
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 shadow-card backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3 sm:max-w-lg lg:max-w-5xl">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/home" className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight tracking-tight text-ink">
              Passdown
            </p>
            <p className="truncate text-[12px] leading-tight text-faint">
              Your campus already has one.
            </p>
          </Link>

          <HeaderNav unread={unread} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showViewSwitch ? <ViewModeSwitch mode={viewMode} /> : null}

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-2.5 pr-1"
          >
            <span className="text-right">
              <span className="block text-[11px] leading-tight text-faint">
                {profile.institution}
              </span>
              <span className="block text-[12px] font-medium leading-tight text-ink">
                {areaLabel(profile.campus_area) ?? "Set your block"}
              </span>
            </span>
            <Avatar name={profile.name} url={profile.avatar_url} size="sm" />
          </Link>
        </div>
      </div>

      {showViewSwitch && viewMode === "demo" ? (
        <p className="border-t border-warn/20 bg-warn-soft px-4 py-1.5 text-center text-[11px] font-medium text-warn">
          Demo view — the campus demand figures below are sample data, not real
          usage. Switch to Real to hide them.
        </p>
      ) : null}
    </header>
  );
}
