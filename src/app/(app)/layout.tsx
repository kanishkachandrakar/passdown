import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { sweepIfStale } from "@/lib/maintenance";
import { requireProfile } from "@/lib/session";
import { getViewMode } from "@/lib/view-mode";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile, supabase } = await requireProfile();

  // A student who never picked a block gets no proximity on any card, which
  // is the one thing Passdown is for. Ask once, up front.
  if (!profile.campus_area) redirect("/welcome");

  // Opportunistic cleanup, throttled to once a minute. See lib/maintenance.ts.
  await sweepIfStale();

  const viewMode = await getViewMode();

  // On a real deployment nobody runs seed.sql, so there is no sample data and
  // the switch would offer a choice between nothing and nothing.
  const { count } = await supabase
    .from("demo_demand")
    .select("item_name", { count: "exact", head: true });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader
        profile={profile}
        viewMode={viewMode}
        showViewSwitch={(count ?? 0) > 0}
      />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4 sm:max-w-lg">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
