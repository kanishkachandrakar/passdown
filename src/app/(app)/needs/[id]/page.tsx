import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemCard } from "@/components/item-card";
import { LiveRefresh } from "@/components/live-refresh";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, EmptyState, LinkButton } from "@/components/ui";
import { cancelNeed } from "@/lib/actions/needs";
import { areaOfPickup, proximityRank } from "@/lib/campus";
import { formatDate, formatPrice, NEED_STATUS_LABEL, plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import type { Item, Match } from "@/lib/types";

export const metadata = { title: "Matches — Passdown" };

type MatchWithItem = Match & { items: Item | null };

/**
 * The match screen. Every card shows why it matched and how far the walk is,
 * and the list is ordered by walk time — closest first, always.
 */
export default async function NeedPage({ params }: PageProps<"/needs/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: need } = await supabase
    .from("needs")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!need) notFound();

  const { data } = await supabase
    .from("matches")
    .select("*, items(*)")
    .eq("need_id", id);

  const matches = ((data as MatchWithItem[] | null) ?? [])
    .filter((m) => m.items?.status === "available")
    .sort(
      (a, b) =>
        proximityRank(profile.campus_area, areaOfPickup(a.items?.pickup_location)) -
          proximityRank(profile.campus_area, areaOfPickup(b.items?.pickup_location)) ||
        b.match_score - a.match_score
    );

  const limit = need.free_only
    ? "Free only"
    : need.max_price !== null
      ? `Up to ${formatPrice(false, need.max_price)}`
      : "Any price";

  return (
    <div className="space-y-6 pd-in">
      <LiveRefresh intervalMs={5000} />

      <div>
        <Link href="/home" className="text-sm text-muted hover:text-ink">
          ← Home
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          {need.item_name}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {need.category} · {limit}
          {need.needed_by ? ` · by ${formatDate(need.needed_by)}` : ""}
        </p>
        <div className="mt-2.5">
          <Chip tone={matches.length ? "accent" : "neutral"}>
            {matches.length
              ? `${matches.length} ${plural(matches.length, "match", "es")}`
              : NEED_STATUS_LABEL[need.status]}
          </Chip>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No live matches yet"
          body="Your need stays open. The moment someone releases something that fits, it appears here and you get told."
          action={
            <LinkButton href="/browse" variant="soft" size="sm">
              Browse what&rsquo;s on campus
            </LinkButton>
          }
        />
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <li key={match.id}>
              <MatchCard match={match} viewerArea={profile.campus_area} />
            </li>
          ))}
        </ul>
      )}

      <form action={cancelNeed} className="pt-2">
        <input type="hidden" name="need_id" value={need.id} />
        <SubmitButton variant="ghost" size="sm" full pendingLabel="Removing…">
          I don&rsquo;t need this any more
        </SubmitButton>
      </form>
    </div>
  );
}

function MatchCard({
  match,
  viewerArea,
}: {
  match: MatchWithItem;
  viewerArea: string | null;
}) {
  if (!match.items) return null;
  const reasons = (match.reasons as string[] | null) ?? [];

  return (
    <Card className="space-y-3 border-accent-line p-3">
      <ItemCard item={match.items} viewerArea={viewerArea} href={`/items/${match.item_id}`} />

      {reasons.length > 0 ? (
        <ul className="space-y-1 border-t border-line pt-3">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-[14px] text-muted">
              <span className="text-accent">✓</span>
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <LinkButton href={`/items/${match.item_id}`} size="md" full>
        See it and claim
      </LinkButton>
    </Card>
  );
}
