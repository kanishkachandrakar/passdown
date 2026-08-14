"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the current server-rendered page on an interval.
 *
 * This is what makes the single-claim lock visible instead of merely true:
 * claim an item in one tab and the other tab flips to "Reserved" on its own,
 * with nobody touching refresh. Polling rather than realtime on purpose —
 * no extra publication config, no extra dependency, and it cannot silently
 * disconnect halfway through a demo.
 */
export function LiveRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}
