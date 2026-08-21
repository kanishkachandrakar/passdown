import { ItemCard } from "@/components/item-card";
import { LiveRefresh } from "@/components/live-refresh";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { areaOfPickup, proximityRank } from "@/lib/campus";
import { daysAgoIso } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import { CATEGORIES } from "@/lib/types";
import { BrowseFilters, type BrowseParams } from "./filters";

export const metadata = { title: "Browse — Passdown" };

const PAGE_SIZE = 40;

/**
 * Browsing is deliberately secondary — Passdown is need-first, not a grid to
 * scroll. It exists for the student who doesn't know what they want yet, and
 * it is still sorted by walk time.
 */
export default async function BrowsePage({
  searchParams,
}: PageProps<"/browse">) {
  const { profile, supabase } = await requireProfile();
  const params = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const current: BrowseParams = {
    category: str(params.category),
    sort: str(params.sort),
    listed: str(params.listed),
    price: str(params.price),
    condition: str(params.condition),
  };
  const category = current.category ?? null;
  const sort = current.sort ?? "close";

  let query = supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .gte("available_until", new Date().toISOString().slice(0, 10))
    .neq("owner_id", profile.id)
    .limit(PAGE_SIZE);

  if (
    category &&
    CATEGORIES.includes(category as (typeof CATEGORIES)[number])
  ) {
    query = query.eq("category", category);
  }

  // Day-wise: when it went up, not when it comes down.
  if (current.listed === "today")
    query = query.gte("created_at", daysAgoIso(1));
  if (current.listed === "week") query = query.gte("created_at", daysAgoIso(7));
  if (current.listed === "month")
    query = query.gte("created_at", daysAgoIso(30));

  if (current.price === "free") query = query.eq("is_free", true);
  if (current.price === "paid") query = query.eq("is_free", false);

  if (current.condition === "like_new")
    query = query.in("condition", ["new", "like_new"]);
  if (current.condition === "good")
    query = query.in("condition", ["new", "like_new", "good"]);

  // "Leaving soon" is the one people actually act on — the stuff about to drop
  // off the board.
  if (sort === "soon")
    query = query.order("available_until", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data } = await query;

  // Proximity can't be an ORDER BY: walk time is computed from the campus map
  // in src/lib/campus.ts, not stored. Small page, so sorting here is fine.
  const items =
    sort === "close"
      ? (data ?? []).sort(
          (a, b) =>
            proximityRank(
              profile.campus_area,
              areaOfPickup(a.pickup_location),
            ) -
            proximityRank(profile.campus_area, areaOfPickup(b.pickup_location)),
        )
      : (data ?? []);

  return (
    <div className="space-y-5 pd-in">
      <LiveRefresh intervalMs={8000} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          On campus right now
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          Everything here is a walk away and every owner is a verified student
          at {profile.institution}. Closest first.
        </p>
      </div>

      <BrowseFilters categories={[...CATEGORIES]} current={current} />

      {items.length === 0 ? (
        <>
          <EmptyState
            title={
              category ? `Nothing in ${category} yet` : "Nothing released yet"
            }
            body="Posting what you need works better than waiting here — it watches for you and tells you the moment something fits."
            action={
              <LinkButton href="/need/new" variant="soft" size="sm">
                Post a need instead
              </LinkButton>
            }
          />
        </>
      ) : (
        <>
          <SectionHeading
            title={`${items.length} available`}
            hint={
              sort === "close"
                ? "Sorted by how far you have to walk."
                : sort === "new"
                  ? "Most recently listed first."
                  : "The ones about to drop off the board first."
            }
          />
          {/*
            A single column is right on a phone and wasteful on a laptop. The
            proximity sort still reads left-to-right, top-to-bottom.
          */}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  viewerArea={profile.campus_area}
                  href={`/items/${item.id}`}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
