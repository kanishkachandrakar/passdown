import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { sweepIfStale } from "@/lib/maintenance";
import { requireProfile } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireProfile();

  // A student who never picked a block gets no proximity on any card, which
  // is the one thing Passdown is for. Ask once, up front.
  if (!profile.campus_area) redirect("/welcome");

  // Opportunistic cleanup, throttled to once a minute. See lib/maintenance.ts.
  await sweepIfStale();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4 sm:max-w-lg">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
