import { ItemCard } from "@/components/item-card";
import { LiveRefresh } from "@/components/live-refresh";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { areaOfPickup, proximityRank } from "@/lib/campus";
import { requireProfile } from "@/lib/session";
import { CATEGORIES } from "@/lib/types";
import { CategoryFilter } from "./category-filter";

export const metadata = { title: "Browse — Passdown" };

const PAGE_SIZE = 40;

/**
 * Browsing is deliberately secondary — Passdown is need-first, not a grid to
 * scroll. It exists for the student who doesn't know what they want yet, and
 * it is still sorted by walk time.
 */
export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const { profile, supabase } = await requireProfile();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : null;

  let query = supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .gte("available_until", new Date().toISOString().slice(0, 10))
    .neq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (category && CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    query = query.eq("category", category);
  }

  const { data } = await query;

  const items = (data ?? []).sort(
    (a, b) =>
      proximityRank(profile.campus_area, areaOfPickup(a.pickup_location)) -
      proximityRank(profile.campus_area, areaOfPickup(b.pickup_location))
  );

  return (
    <div className="space-y-5 pd-in">
      <LiveRefresh intervalMs={8000} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          On campus right now
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          Everything here is a walk away and every owner is a verified student at{" "}
          {profile.institution}. Closest first.
        </p>
      </div>

      <CategoryFilter categories={[...CATEGORIES]} active={category} />

      {items.length === 0 ? (
        <EmptyState
          title={category ? `Nothing in ${category} yet` : "Nothing released yet"}
          body="Posting what you need works better than waiting here — it watches for you and tells you the moment something fits."
          action={
            <LinkButton href="/need/new" variant="soft" size="sm">
              Post a need instead
            </LinkButton>
          }
        />
      ) : (
        <>
          <SectionHeading
            title={`${items.length} available`}
            hint="Sorted by how far you have to walk."
          />
          <ul className="space-y-2">
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
