import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Chip } from "@/components/ui";
import { extendNeed } from "@/lib/actions/needs";
import { formatDate, formatPrice, plural } from "@/lib/format";
import type { Need } from "@/lib/types";

export function NeedRow({ need, matchCount }: { need: Need; matchCount: number }) {
  const stale = need.status === "expired";

  const limit = need.free_only
    ? "Free only"
    : need.max_price !== null
      ? `Up to ${formatPrice(false, need.max_price)}`
      : "Any price";

  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-ink">{need.item_name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {need.category} · {limit}
            {need.needed_by ? ` · by ${formatDate(need.needed_by)}` : ""}
          </p>
        </div>

        {matchCount > 0 ? (
          <Chip tone="accent" className="shrink-0">
            {matchCount} {plural(matchCount, "match", "es")}
          </Chip>
        ) : (
          <Chip className="shrink-0">{stale ? "Date passed" : "Waiting"}</Chip>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {matchCount > 0 ? (
          <Link
            href={`/needs/${need.id}`}
            className="text-sm font-medium text-accent hover:text-accent-strong"
          >
            See {matchCount === 1 ? "the match" : "all matches"} →
          </Link>
        ) : stale ? (
          <>
            <span className="text-sm text-muted">
              Nobody released one in time.
            </span>
            <form action={extendNeed}>
              <input type="hidden" name="need_id" value={need.id} />
              <SubmitButton variant="soft" size="sm" pendingLabel="Extending…">
                Keep looking
              </SubmitButton>
            </form>
          </>
        ) : (
          <span className="text-sm text-muted">
            Waiting for someone to release one.
          </span>
        )}
      </div>
    </div>
  );
}
