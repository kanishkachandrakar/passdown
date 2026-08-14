import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemCard } from "@/components/item-card";
import { Card, LinkButton, Notice } from "@/components/ui";
import { plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata = { title: "Released — Passdown" };

/**
 * The hook. A student who just spent a minute typing needs to see immediately
 * that it was worth it — the count below is the number of real open needs this
 * item actually matched, not a made-up figure.
 */
export default async function ReleaseDonePage({
  params,
}: PageProps<"/release/[id]/done">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (!item) notFound();

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("item_id", id);

  const waiting = count ?? 0;

  return (
    <div className="space-y-6 pd-in">
      <div className="text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
          Released
        </p>

        {waiting > 0 ? (
          <>
            <p className="mt-4 text-[3.5rem] font-semibold leading-none tabular text-accent">
              {waiting}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {plural(waiting, "student")} already {waiting === 1 ? "needs" : "need"} this
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
              They&rsquo;ve been told. The first one to claim it holds it for ten
              minutes, then you&rsquo;ll both get a pickup spot and a code.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
              It&rsquo;s on the board
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
              Nobody has an open need matching this one right now. It stays
              listed until{" "}
              {new Date(`${item.available_until}T00:00:00`).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "long" }
              )}
              , and anyone posting a need can still find it.
            </p>
          </>
        )}
      </div>

      <Card className="p-3">
        <ItemCard item={item} viewerArea={profile.campus_area} href={`/items/${item.id}`} />
      </Card>

      <Notice>
        Passdown never handles money. If you set a price, it changes hands in
        person when you meet.
      </Notice>

      <div className="space-y-2">
        <LinkButton href="/home" size="lg" full>
          Back to home
        </LinkButton>
        <div className="text-center">
          <Link href="/release" className="text-sm font-medium text-accent">
            Release something else
          </Link>
        </div>
      </div>
    </div>
  );
}
