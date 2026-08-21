import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { ItemThumb } from "@/components/item-thumb";
import { LiveRefresh } from "@/components/live-refresh";
import { NeedRow } from "@/components/need-row";
import { Remaining } from "@/components/remaining";
import {
  Card,
  Chip,
  DemoBadge,
  EmptyState,
  LinkButton,
  Notice,
  SectionHeading,
} from "@/components/ui";
import { areaOfPickup, proximityLabel, proximityRank } from "@/lib/campus";
import { firstName, plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import type { Item, Match, Need } from "@/lib/types";
import { getViewMode } from "@/lib/view-mode";

export const metadata = { title: "Home — Passdown" };

type MatchWithItem = Match & { items: Item | null };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { profile, supabase } = await requireProfile();
  const params = await searchParams;
  const viewMode = await getViewMode();

  const [needsResult, demandResult, reservationResult, handoffResult] =
    await Promise.all([
      supabase
        .from("needs")
        .select("*")
        .eq("user_id", profile.id)
        .in("status", ["open", "matched", "expired"])
        .order("created_at", { ascending: false }),
      supabase
        .from("demo_demand")
        .select("*")
        .order("waiting", { ascending: false })
        .limit(6),
      supabase
        .from("reservations")
        .select("*, items(*)")
        .eq("claimant_id", profile.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("handoffs")
        .select("*, items(*)")
        .eq("status", "scheduled")
        .or(`giver_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  // Your own listings, so getting back to something you released doesn't mean
  // a trip through Profile.
  const { data: myItems } = await supabase
    .from("items")
    .select("*")
    .eq("owner_id", profile.id)
    .in("status", ["available", "reserved", "claimed"])
    .order("created_at", { ascending: false })
    .limit(6);

  const needs: Need[] = needsResult.data ?? [];

  // Match counts per need, live items only — a match against something that
  // has since been claimed is not a match worth counting.
  let matches: MatchWithItem[] = [];
  if (needs.length) {
    const { data } = await supabase
      .from("matches")
      .select("*, items(*)")
      .in(
        "need_id",
        needs.map((n) => n.id),
      )
      .order("match_score", { ascending: false });
    matches = (data as MatchWithItem[] | null) ?? [];
  }

  const liveMatches = matches.filter((m) => m.items?.status === "available");

  const countsByNeed = new Map<string, number>();
  for (const match of liveMatches) {
    countsByNeed.set(match.need_id, (countsByNeed.get(match.need_id) ?? 0) + 1);
  }

  const recentMatches = [...liveMatches]
    .sort(
      (a, b) =>
        proximityRank(
          profile.campus_area,
          areaOfPickup(a.items?.pickup_location),
        ) -
        proximityRank(
          profile.campus_area,
          areaOfPickup(b.items?.pickup_location),
        ),
    )
    .slice(0, 3);

  const reservation = reservationResult.data;
  const handoffs = handoffResult.data ?? [];
  const posted = params.posted;

  return (
    <div className="mx-auto max-w-lg space-y-8 pd-in lg:max-w-none">
      <LiveRefresh intervalMs={5000} />

      {posted === "need" ? (
        <Notice tone="accent">
          Need posted. You&rsquo;ll be told the moment someone releases a match.
        </Notice>
      ) : null}

      {/* An open reservation outranks everything — ten minutes is not long. */}
      {reservation?.items ? (
        <Link
          href={`/reservations/${reservation.id}`}
          className="block rounded-2xl border-2 border-danger/40 wash-danger p-4 shadow-lift ring-4 ring-danger/10 transition hover:ring-danger/20"
        >
          <div className="flex items-center gap-3">
            <ItemThumb item={reservation.items} tone="danger" />
            <div className="min-w-0 flex-1">
              <p className="pd-pulse text-[13px] font-semibold uppercase tracking-wide text-danger">
                ● You&rsquo;re holding this
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-ink">
                {reservation.items.name}
              </p>
            </div>
            <span className="tabular shrink-0 text-3xl font-semibold text-danger">
              <Remaining expiresAt={reservation.expires_at} />
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-danger">
            Confirm before the timer runs out or it goes back to everyone else →
          </p>
        </Link>
      ) : null}

      {handoffs.map((handoff) => (
        <Link
          key={handoff.id}
          href={`/handoffs/${handoff.id}`}
          className="block rounded-2xl border-2 border-accent-line wash-soft p-4 shadow-lift ring-4 ring-accent/10 transition hover:ring-accent/20"
        >
          <div className="flex items-center gap-3">
            {handoff.items ? <ItemThumb item={handoff.items as Item} /> : null}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-accent-strong">
                ✓ Handoff arranged
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-ink">
                {(handoff.items as Item | null)?.name ?? "Item"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-accent-strong">
            Tap for the pickup spot and your 4-digit code →
          </p>
        </Link>
      ))}

      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Hi {firstName(profile.name)} — what are you doing?
        </h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BigAction
            href="/need/new"
            title="I need something"
            body="Say what you're after. We'll watch for it and tell you the moment it appears."
          />
          <BigAction
            href="/release"
            title="I'm done with something"
            body="Sixty seconds to release it. You'll see how many students are already waiting."
          />
        </div>
      </section>

      {/* Two columns once there is room for them: your own stuff on the
          left, what campus is offering on the right. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <section>
          <SectionHeading
            title="Your needs"
            action={
              needs.length ? (
                <Link
                  href="/need/new"
                  className="text-sm font-medium text-accent"
                >
                  Add
                </Link>
              ) : null
            }
          />

          {needs.length === 0 ? (
            <EmptyState
              title="Nothing on your list yet"
              body="Post what you're looking for. It sits quietly until someone on campus releases a match."
              action={
                <LinkButton href="/need/new" variant="soft" size="sm">
                  Post a need
                </LinkButton>
              }
            />
          ) : (
            <ul className="space-y-2">
              {needs.map((need) => (
                <li key={need.id}>
                  <NeedRow
                    need={need}
                    matchCount={countsByNeed.get(need.id) ?? 0}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {myItems && myItems.length > 0 ? (
          <section>
            <SectionHeading
              title="Your items"
              action={
                <Link
                  href="/release"
                  className="text-sm font-medium text-accent"
                >
                  Release
                </Link>
              }
            />
            <ul className="space-y-2">
              {myItems.map((item) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    viewerArea={profile.campus_area}
                    href={`/items/${item.id}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recentMatches.length > 0 ? (
          <section>
            <SectionHeading title="Closest matches" hint="Nearest first." />
            <ul className="space-y-2">
              {recentMatches.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/items/${match.item_id}`}
                    className="block rounded-2xl border border-accent-line bg-surface p-3.5 transition hover:border-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-ink">
                        {match.items?.name}
                      </p>
                      <Chip tone="accent">Match</Chip>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {proximityLabel(
                        profile.campus_area,
                        areaOfPickup(match.items?.pickup_location),
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {viewMode === "demo" &&
        demandResult.data &&
        demandResult.data.length > 0 ? (
          <section>
            <SectionHeading
              title="Students near you need"
              action={<DemoBadge />}
              hint="Figures for the demo campus, not measured usage."
            />
            <Card className="divide-y divide-line py-0">
              {demandResult.data.map((row) => (
                <div
                  key={row.item_name}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="truncate text-[15px] text-ink">
                    {row.item_name}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {row.waiting} {plural(row.waiting, "student")} waiting
                  </span>
                </div>
              ))}
            </Card>
            <p className="mt-2 px-1 text-[12px] leading-relaxed text-faint">
              Sitting on any of these? Releasing one takes about a minute.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function BigAction({
  href,
  title,
  body,
  tone = "soft",
}: {
  href: string;
  title: string;
  body: string;
  tone?: "solid" | "soft";
}) {
  const solid = tone === "solid";

  return (
    <Link
      href={href}
      className={
        "group relative block overflow-hidden rounded-2xl p-4 transition " +
        (solid
          ? "wash-accent text-white shadow-glow hover:brightness-110"
          : "border border-accent-line wash-soft shadow-card hover:-translate-y-0.5 hover:shadow-lift")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={
            "text-[17px] font-semibold " + (solid ? "text-white" : "text-ink")
          }
        >
          {title}
        </p>
        <span
          className={
            "shrink-0 text-lg transition group-hover:translate-x-0.5 " +
            (solid ? "text-white/80" : "text-accent")
          }
          aria-hidden="true"
        >
          →
        </span>
      </div>
      <p
        className={
          "mt-1 text-sm leading-relaxed " +
          (solid ? "text-white/85" : "text-muted")
        }
      >
        {body}
      </p>
    </Link>
  );
}
