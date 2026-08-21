import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ItemCard } from "@/components/item-card";
import { MessageButton } from "@/components/message-button";
import { BlockButton } from "@/components/block-button";
import { Card, Chip, EmptyState, SectionHeading } from "@/components/ui";
import { areaLabel, walkMinutes } from "@/lib/campus";
import { plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata = { title: "Student — Passdown" };

/**
 * Another student's page.
 *
 * Trust surface plus what else they're offering — the two things worth
 * knowing before you walk across campus to meet someone. Deliberately not a
 * social profile: a picture and a name, but no bio, no following and no
 * ratings. Everything here is either a fact the database counted or something
 * they listed.
 */
export default async function StudentPage({
  params,
}: PageProps<"/students/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  if (id === profile.id) redirect("/profile");

  // RLS restricts profiles to your own institution, so someone at another
  // campus simply doesn't exist as far as this query is concerned.
  const { data: student } = await supabase
    .from("profiles")
    .select(
      "id, name, avatar_url, institution, campus_area, successful_handoffs, missed_pickups",
    )
    .eq("id", id)
    .maybeSingle();

  if (!student) notFound();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("owner_id", id)
    .eq("status", "available")
    .gte("available_until", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: block } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", profile.id)
    .eq("blocked_id", id)
    .maybeSingle();

  const blocked = Boolean(block);
  const walk = walkMinutes(profile.campus_area, student.campus_area);
  const listings = items ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 pd-in">
      <Link href="/browse" className="text-sm text-muted hover:text-ink">
        ← Browse
      </Link>

      <section className="flex items-start gap-4">
        <Avatar name={student.name} url={student.avatar_url} size="xl" />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">
            {student.name}
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            {student.institution}
            {student.campus_area ? ` · ${areaLabel(student.campus_area)}` : ""}
            {walk !== null && walk > 0 ? ` · ${walk} min walk from you` : ""}
            {walk === 0 ? " · your block" : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="accent">Verified Student ✓</Chip>
            {blocked ? <Chip tone="danger">Blocked</Chip> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="tabular text-3xl font-semibold text-accent">
            {student.successful_handoffs}
          </p>
          <p className="mt-0.5 text-[13px] text-faint">
            {plural(student.successful_handoffs, "completed handoff")}
          </p>
        </Card>
        <Card className="text-center">
          <p className="tabular text-3xl font-semibold text-muted">
            {student.missed_pickups}
          </p>
          <p className="mt-0.5 text-[13px] text-faint">
            {plural(student.missed_pickups, "missed pickup")}
          </p>
        </Card>
      </section>

      {!blocked ? (
        <section>
          <MessageButton
            otherId={student.id}
            label={`Message ${student.name}`}
          />
        </section>
      ) : null}

      <section>
        <SectionHeading
          title={`Also offering`}
          hint={
            listings.length
              ? "Everything they have on the board right now."
              : undefined
          }
        />
        {listings.length === 0 ? (
          <EmptyState
            title="Nothing else listed"
            body="They have nothing else available at the moment."
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {listings.map((item) => (
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

      <section className="border-t border-line pt-6">
        <BlockButton
          otherId={student.id}
          name={student.name}
          blocked={blocked}
        />
        <p className="mt-2 text-[12px] leading-relaxed text-faint">
          Blocking stops messages in both directions. It doesn&rsquo;t hide
          their listings, and it doesn&rsquo;t tell them.
        </p>
      </section>
    </div>
  );
}
