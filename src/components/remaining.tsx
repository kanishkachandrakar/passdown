"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";

/**
 * A live mm:ss remaining, for places that show a hold without being the
 * reservation screen itself.
 *
 * The first value is computed during render so the server sends real digits —
 * this sits on the most urgent card on the home screen, and a placeholder
 * there reads as broken. Server and client clocks differ by a second or so,
 * hence suppressHydrationWarning; the interval corrects it immediately.
 */
export function Remaining({ expiresAt }: { expiresAt: string }) {
  const deadline = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span className="tabular" suppressHydrationWarning>
      {formatCountdown(remaining)}
    </span>
  );
}
