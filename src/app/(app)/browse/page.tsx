import { ItemCard } from "@/components/item-card";
import { LiveRefresh } from "@/components/live-refresh";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { areaOfPickup, proximityRank } from "@/lib/campus";
import { requireProfile } from "@/lib/session";
import { CATEGORIES } from "@/lib/types";
import { getViewMode } from "@/lib/view-mode";
import { localInboxUrl } from "@/lib/local-dev";
import { CategoryFilter } from "./category-filter";

/**
 * Local development only.
 *
 * Passdown is campus-scoped, so listings seeded for one institution are
 * invisible to an account at another — correct, and baffling the first time it
 * happens to you. If Browse is empty on a local install, say why and give the
 * exact command.
 */
function EmptyBrowseDevHint({ institution }: { institution: string }) {
  if (!localInboxUrl()) return null;

  return (
    <div className="mt-3 rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3">
      <p className="text-sm font-medium text-warn">
        Running locally with nothing seeded for {institution}?
      </p>
      <p className="mt-1 text-sm leading-relaxed text-warn">
        Sample listings are scoped to one institution, like real ones. To fill
        this page for yours:
      </p>
      <code className="mt-2 block rounded-lg bg-surface/70 px-2.5 py-1.5 font-mono text-[12px] text-ink">
        npm run seed:demo -- --domain={institution}
      </code>
    </div>
  );
}

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
  const viewMode = await getViewMode();

  let query = supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .gte("available_until", new Date().toISOString().slice(0, 10))
    .neq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  // Real view means real listings only. Sample stock is removed outright, not
  // greyed out — see the Demo/Real switch in the header.
  if (viewMode === "user") query = query.eq("is_demo", false);

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
        <>
          <EmptyState
            title={category ? `Nothing in ${category} yet` : "Nothing released yet"}
            body="Posting what you need works better than waiting here — it watches for you and tells you the moment something fits."
            action={
              <LinkButton href="/need/new" variant="soft" size="sm">
                Post a need instead
              </LinkButton>
            }
          />
          <EmptyBrowseDevHint institution={profile.institution} />
        </>
      ) : (
        <>
          <SectionHeading
            title={`${items.length} available`}
            hint="Sorted by how far you have to walk."
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
