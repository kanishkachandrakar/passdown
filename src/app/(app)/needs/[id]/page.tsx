import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemCard } from "@/components/item-card";
import { LiveRefresh } from "@/components/live-refresh";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, EmptyState, LinkButton, Notice } from "@/components/ui";
import { cancelNeed } from "@/lib/actions/needs";
import { areaOfPickup, proximityRank } from "@/lib/campus";
import { matchNeedToItems } from "@/lib/matching";
import {
  formatDate,
  formatPrice,
  NEED_STATUS_LABEL,
  plural,
} from "@/lib/format";
import { requireProfile } from "@/lib/session";
import type { Item, Match } from "@/lib/types";

export const metadata = { title: "Matches — Passdown" };

type MatchWithItem = Match & { items: Item | null };

/**
 * The match screen. Every card shows why it matched and how far the walk is,
 * and the list is ordered by walk time — closest first, always.
 */
export default async function NeedPage({
  params,
  searchParams,
}: PageProps<"/needs/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const fresh = query.fresh === "1";
  const updated = query.updated === "1";
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

  const allMatches = (data as MatchWithItem[] | null) ?? [];
  const itemIds = allMatches.map((m) => m.item_id);

  /*
    A match whose item you are already holding must not read as "no matches".
    Someone who opens this screen mid-claim is looking for the fridge they just
    claimed, so the way back to it lives at the top.
  */
  const [{ data: myReservations }, { data: myHandoffs }] = itemIds.length
    ? await Promise.all([
        supabase
          .from("reservations")
          .select("id, item_id, status")
          .in("item_id", itemIds)
          .eq("claimant_id", profile.id)
          .in("status", ["active", "confirmed"]),
        supabase
          .from("handoffs")
          .select("id, item_id, status")
          .in("item_id", itemIds)
          .eq("receiver_id", profile.id),
      ])
    : [{ data: [] }, { data: [] }];

  const handoffByItem = new Map((myHandoffs ?? []).map((h) => [h.item_id, h]));
  const reservationByItem = new Map(
    (myReservations ?? []).map((r) => [r.item_id, r]),
  );

  const yours = allMatches.filter(
    (m) => handoffByItem.has(m.item_id) || reservationByItem.has(m.item_id),
  );

  const matches = allMatches
    .filter((m) => m.items?.status === "available")
    .sort(
      (a, b) =>
        proximityRank(
          profile.campus_area,
          areaOfPickup(a.items?.pickup_location),
        ) -
          proximityRank(
            profile.campus_area,
            areaOfPickup(b.items?.pickup_location),
          ) || b.match_score - a.match_score,
    );

  /*
    A need that filters on price can end up with nothing while the thing it
    asked for sits on the board at a price. Silently showing "no matches" is
    the worst version of that, so work out what the price filter is hiding and
    say so.
  */
  let hiddenByPrice = 0;
  if (need.free_only || need.max_price !== null) {
    const { data: onBoard } = await supabase
      .from("items")
      .select("*")
      .eq("status", "available")
      .gte("available_until", new Date().toISOString().slice(0, 10))
      .neq("owner_id", profile.id)
      .limit(100);

    const asNeed = {
      id: need.id,
      user_id: need.user_id,
      item_name: need.item_name,
      category: need.category,
      needed_by: need.needed_by,
      preferred_condition: need.preferred_condition,
      campus_area: profile.campus_area,
    };

    const withoutPriceFilter = matchNeedToItems(
      { ...asNeed, free_only: false, max_price: null },
      (onBoard ?? []).map((i) => ({ ...i, price: Number(i.price) })),
      (item) => areaOfPickup(item.pickup_location),
    );

    const alreadyShown = new Set(matches.map((m) => m.item_id));
    hiddenByPrice = withoutPriceFilter.filter(
      (m) => !alreadyShown.has(m.item_id),
    ).length;
  }

  const limit = need.free_only
    ? "Free only"
    : need.max_price !== null
      ? `Up to ${formatPrice(false, need.max_price)}`
      : "Any price";

  return (
    <div className="mx-auto max-w-lg space-y-6 pd-in">
      <LiveRefresh intervalMs={5000} />

      {/*
        Posted a need and it matched something already on the board — this is
        the answer to the question they just asked, so say so plainly.
      */}
      {updated ? (
        <Notice tone="accent">
          Need updated. We&rsquo;ve looked again with the new criteria.
        </Notice>
      ) : null}

      {fresh && matches.length > 0 ? (
        <Notice tone="accent">
          Already on campus: {matches.length}{" "}
          {matches.length === 1 ? "student has" : "students have"} one of these
          listed right now.
        </Notice>
      ) : null}

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
        <div className="mt-2.5 flex items-center gap-3">
          <Chip tone={matches.length || yours.length ? "accent" : "neutral"}>
            {matches.length
              ? `${matches.length} ${plural(matches.length, "match", "es")}`
              : NEED_STATUS_LABEL[need.status]}
          </Chip>
          <Link
            href={`/needs/${need.id}/edit`}
            className="text-sm font-medium text-accent hover:text-accent-strong"
          >
            Edit
          </Link>
        </div>
      </div>

      {yours.map((match) => {
        const handoff = handoffByItem.get(match.item_id);
        const reservation = reservationByItem.get(match.item_id);
        const href = handoff
          ? `/handoffs/${handoff.id}`
          : `/reservations/${reservation!.id}`;

        return (
          <Link
            key={match.id}
            href={href}
            className="block rounded-2xl border border-accent-line bg-accent-soft p-4"
          >
            <p className="text-[13px] font-semibold uppercase tracking-wide text-accent-strong">
              {handoff ? "Handoff arranged" : "You're holding this"}
            </p>
            <p className="mt-1 font-medium text-ink">{match.items?.name}</p>
            <p className="mt-1 text-sm text-accent-strong">
              {handoff
                ? "Tap for the pickup spot and your 4-digit code."
                : "Tap to confirm before your ten minutes run out."}
            </p>
          </Link>
        );
      })}

      {hiddenByPrice > 0 ? (
        <Notice tone="warn">
          {hiddenByPrice}{" "}
          {hiddenByPrice === 1 ? "listing matches" : "listings match"} what you
          asked for but {hiddenByPrice === 1 ? "costs" : "cost"} money, and you
          said{" "}
          {need.free_only
            ? "free only"
            : `up to ${formatPrice(false, need.max_price!)}`}
          .{" "}
          <Link href={`/needs/${need.id}/edit`} className="underline">
            Change that
          </Link>{" "}
          to see {hiddenByPrice === 1 ? "it" : "them"}.
        </Notice>
      ) : null}

      {matches.length === 0 && yours.length === 0 ? (
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
      <ItemCard
        item={match.items}
        viewerArea={viewerArea}
        href={`/items/${match.item_id}`}
      />

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
