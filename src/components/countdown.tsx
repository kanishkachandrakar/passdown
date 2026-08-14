"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";
import { cx } from "./ui";

/**
 * The ten-minute hold, counted down in the browser off the server's
 * `expires_at`. The timer is a display of the deadline, never the authority on
 * it — `confirm_claim` re-checks expiry in Postgres, so a fiddled clock buys
 * nobody an extra second.
 */
export function Countdown({
  expiresAt,
  onExpiredMessage,
}: {
  expiresAt: string;
  onExpiredMessage?: string;
}) {
  const router = useRouter();
  const deadline = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = deadline - Date.now();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 250);

    return () => clearInterval(id);
  }, [deadline, router]);

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 60_000;

  if (expired) {
    return (
      <div className="rounded-2xl border border-line bg-canvas p-5 text-center">
        <p className="tabular text-4xl font-semibold text-faint">0:00</p>
        <p className="mt-2 text-sm text-muted">
          {onExpiredMessage ?? "Reservation expired. The item is available again."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "rounded-2xl border p-5 text-center transition-colors",
        urgent ? "border-danger/25 bg-danger-soft" : "border-warn/25 bg-warn-soft"
      )}
    >
      <p className="text-[13px] font-semibold uppercase tracking-wide text-warn">
        Held for you
      </p>
      <p
        className={cx(
          "tabular mt-1 text-5xl font-semibold leading-none",
          urgent ? "text-danger" : "text-warn"
        )}
        role="timer"
        aria-live="off"
      >
        {formatCountdown(remaining)}
      </p>
      <p className="mt-2 text-sm text-warn">
        Nobody else can claim it while this runs.
      </p>
    </div>
  );
}
