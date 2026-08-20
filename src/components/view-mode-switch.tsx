"use client";

import { useOptimistic, useTransition } from "react";

import { setViewMode } from "@/lib/actions/view-mode";
import type { ViewMode } from "@/lib/view-mode";
import { cx } from "./ui";

/**
 * Two-position switch in the header. Optimistic, because a toggle that waits
 * for a round trip before moving feels broken.
 */
export function ViewModeSwitch({ mode }: { mode: ViewMode }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic<ViewMode, ViewMode>(mode, (_, next) => next);

  const choose = (next: ViewMode) => {
    if (next === shown) return;
    startTransition(async () => {
      setShown(next);
      const data = new FormData();
      data.set("mode", next);
      await setViewMode(data);
    });
  };

  return (
    <div
      role="group"
      aria-label="Data view"
      className={cx(
        "inline-flex rounded-full border border-line bg-canvas p-0.5",
        pending && "opacity-70"
      )}
    >
      <Option label="Demo" active={shown === "demo"} onSelect={() => choose("demo")} />
      <Option label="Real" active={shown === "user"} onSelect={() => choose("user")} />
    </div>
  );
}

function Option({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cx(
        "rounded-full px-2.5 py-1 text-[12px] font-medium transition",
        active ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-muted"
      )}
    >
      {label}
    </button>
  );
}
