"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";

/**
 * A live mm:ss remaining, for places that show a hold without being the
 * reservation screen itself. Rendering this on the server would bake in the
 * time at render and then sit there frozen.
 */
export function Remaining({ expiresAt }: { expiresAt: string }) {
  const deadline = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // Nothing until the client has a clock, so server and first paint agree.
  if (remaining === null) return <span className="tabular">--:--</span>;

  return <span className="tabular">{formatCountdown(remaining)}</span>;
}
