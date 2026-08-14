import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { signOut } from "@/lib/actions/profile";
import { areaLabel } from "@/lib/campus";
import { formatDate, NEED_STATUS_LABEL, plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata = { title: "Profile — Passdown" };

/**
 * Trust surface, and nothing more: verified, completed handoffs, missed
 * pickups. No bios, no followers, no star ratings — and no aggregate platform
 * numbers, because those would be ours to inflate.
 */
export default async function ProfilePage() {
  const { profile, supabase } = await requireProfile();

  const [itemsResult, needsResult, handoffsResult] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("needs")
      .select("*")
      .eq("user_id", profile.id)
      .in("status", ["open", "matched"])
      .order("created_at", { ascending: false }),
    supabase
      .from("handoffs")
      .select("id, status, items(name)")
      .eq("status", "completed")
      .or(`giver_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const items = itemsResult.data ?? [];
  const needs = needsResult.data ?? [];
  const completed = handoffsResult.data ?? [];

  const liveItems = items.filter((i) => i.status === "available" || i.status === "reserved");
  const pastItems = items.filter((i) => !liveItems.includes(i));

  return (
    <div className="space-y-8 pd-in">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {profile.name}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {profile.institution} · {areaLabel(profile.campus_area) ?? "No block set"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="accent">Verified Student ✓</Chip>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat
          value={profile.successful_handoffs}
          label={plural(profile.successful_handoffs, "completed handoff")}
        />
        <Stat
          value={profile.missed_pickups}
          label={plural(profile.missed_pickups, "missed pickup")}
          muted
        />
      </section>

      <section>
        <SectionHeading
          title="Your items"
          action={
            <Link href="/release" className="text-sm font-medium text-accent">
              Release
            </Link>
          }
        />
        {liveItems.length === 0 ? (
          <EmptyState
            title="Nothing listed"
            body="Anything you're done with at the end of term goes here."
            action={
              <LinkButton href="/release" variant="soft" size="sm">
                Release something
              </LinkButton>
            }
          />
        ) : (
          <ul className="space-y-2">
            {liveItems.map((item) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  viewerArea={profile.campus_area}
                  href={`/items/${item.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {needs.length > 0 ? (
        <section>
          <SectionHeading title="Your open needs" />
          <Card className="divide-y divide-line py-0">
            {needs.map((need) => (
              <Link
                key={need.id}
                href={`/needs/${need.id}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-ink">
                    {need.item_name}
                  </span>
                  <span className="block text-[13px] text-faint">
                    {need.needed_by ? `by ${formatDate(need.needed_by)}` : "No date"}
                  </span>
                </span>
                <Chip>{NEED_STATUS_LABEL[need.status]}</Chip>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <SectionHeading title="Passed down" />
          <Card className="divide-y divide-line py-0">
            {completed.map((handoff) => (
              <Link
                key={handoff.id}
                href={`/handoffs/${handoff.id}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="truncate text-[15px] text-ink">
                  {(handoff.items as { name: string } | null)?.name ?? "Item"}
                </span>
                <Chip tone="accent">Complete</Chip>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      {pastItems.length > 0 ? (
        <section>
          <SectionHeading title="No longer listed" />
          <ul className="space-y-2">
            {pastItems.map((item) => (
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

      <section className="space-y-2 border-t border-line pt-6">
        <LinkButton href="/welcome" variant="secondary" size="md" full>
          Change your name or block
        </LinkButton>
        <form action={signOut}>
          <SubmitButton variant="ghost" size="sm" full pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}

function Stat({
  value,
  label,
  muted,
}: {
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <Card className="text-center">
      <p
        className={`tabular text-3xl font-semibold ${muted ? "text-muted" : "text-accent"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[13px] text-faint">{label}</p>
    </Card>
  );
}
