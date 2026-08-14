import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmHandoffForm } from "@/components/confirm-handoff-form";
import { LiveRefresh } from "@/components/live-refresh";
import { Card, Chip, LinkButton, Notice } from "@/components/ui";
import { areaOfPickup, pickupLabel, proximityLabel } from "@/lib/campus";
import { formatPrice } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata = { title: "Handoff — Passdown" };

export default async function HandoffPage({ params }: PageProps<"/handoffs/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: handoff } = await supabase
    .from("handoffs")
    .select(
      "*, items(*), giver:profiles!handoffs_giver_id_fkey(name), receiver:profiles!handoffs_receiver_id_fkey(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!handoff || !handoff.items) notFound();

  const item = handoff.items;
  const isGiver = handoff.giver_id === profile.id;
  const otherName =
    (isGiver
      ? (handoff.receiver as { name: string } | null)?.name
      : (handoff.giver as { name: string } | null)?.name) ?? "The other student";

  const youConfirmed = isGiver ? handoff.giver_confirmed : handoff.receiver_confirmed;
  const theyConfirmed = isGiver ? handoff.receiver_confirmed : handoff.giver_confirmed;
  const done = handoff.status === "completed";

  return (
    <div className="space-y-5 pd-in">
      <LiveRefresh intervalMs={4000} />

      <Link href="/home" className="text-sm text-muted hover:text-ink">
        ← Home
      </Link>

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
          {done ? "Passed down" : isGiver ? "You're handing this over" : "You're picking this up"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {item.name}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {formatPrice(item.is_free, item.price)} · with {otherName}
        </p>
      </div>

      {done ? (
        <Notice tone="accent">
          Both of you confirmed. That&rsquo;s one more thing that stayed on campus
          instead of going in a skip.
        </Notice>
      ) : null}

      <Card className="text-center">
        <p className="text-[13px] uppercase tracking-wide text-faint">
          Confirmation code
        </p>
        <p className="tabular mt-1 text-5xl font-semibold tracking-[0.2em] text-ink">
          {handoff.confirmation_code}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Say it out loud when you meet. Same four digits on both screens — that
          is how you know you&rsquo;ve found the right person.
        </p>
      </Card>

      <Card className="space-y-2.5">
        <Row label="Where" value={pickupLabel(item.pickup_location)} />
        <Row
          label="Distance"
          value={proximityLabel(
            profile.campus_area,
            areaOfPickup(item.pickup_location)
          )}
        />
        <Row label="When" value="Agree it in person — this is a walk, not a delivery." />
        {!item.is_free ? (
          <Row
            label="Payment"
            value={`${formatPrice(false, item.price)} in person. Passdown never handles money.`}
          />
        ) : null}
      </Card>

      <div className="flex gap-2">
        <Chip tone={youConfirmed ? "accent" : "neutral"}>
          {youConfirmed ? "You confirmed ✓" : "You haven't confirmed"}
        </Chip>
        <Chip tone={theyConfirmed ? "accent" : "neutral"}>
          {theyConfirmed ? `${otherName} confirmed ✓` : `Waiting on ${otherName}`}
        </Chip>
      </div>

      {done ? (
        <LinkButton href="/home" size="lg" full>
          Back to home
        </LinkButton>
      ) : youConfirmed ? (
        <Notice>
          You&rsquo;re done. This closes the moment {otherName} confirms too.
        </Notice>
      ) : (
        <ConfirmHandoffForm handoffId={handoff.id} isGiver={isGiver} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[13px] text-faint">{label}</span>
      <span className="text-right text-[15px] text-ink">{value}</span>
    </div>
  );
}
