import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmClaimForm } from "@/components/confirm-claim-form";
import { Countdown } from "@/components/countdown";
import { ItemThumb } from "@/components/item-thumb";
import { MessageButton } from "@/components/message-button";
import { SubmitButton } from "@/components/submit-button";
import { Card, LinkButton, Notice } from "@/components/ui";
import { releaseReservation } from "@/lib/actions/claims";
import { areaOfPickup, pickupLabel, proximityLabel } from "@/lib/campus";
import { formatPrice, hasLapsed } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata = { title: "Your reservation — Passdown" };

export default async function ReservationPage({
  params,
}: PageProps<"/reservations/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "*, items(*, owner:profiles!items_owner_id_fkey(id, name, avatar_url))",
    )
    .eq("id", id)
    .eq("claimant_id", profile.id)
    .maybeSingle();

  if (!reservation || !reservation.items) notFound();

  const item = reservation.items;
  const owner = item.owner as {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  const expired =
    reservation.status === "expired" ||
    (reservation.status === "active" && hasLapsed(reservation.expires_at));

  if (reservation.status === "confirmed") {
    const { data: handoff } = await supabase
      .from("handoffs")
      .select("id")
      .eq("item_id", item.id)
      .maybeSingle();

    return (
      <div className="space-y-4 pd-in">
        <Notice tone="accent">You already confirmed this claim.</Notice>
        {handoff ? (
          <LinkButton href={`/handoffs/${handoff.id}`} size="lg" full>
            Go to the handoff
          </LinkButton>
        ) : (
          <LinkButton href="/home" size="lg" full>
            Back to home
          </LinkButton>
        )}
      </div>
    );
  }

  if (reservation.status === "cancelled") {
    return (
      <div className="space-y-4 pd-in">
        <Notice>You let this one go. It&rsquo;s back on the board.</Notice>
        <LinkButton href={`/items/${item.id}`} size="lg" full>
          See the item
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pd-in">
      {/*
        Leaving here doesn't drop the hold — the reservation stands until it's
        confirmed, given back, or the ten minutes run out. Say so, or the only
        obvious way off this screen looks like abandoning the item.
      */}
      <Link href="/home" className="text-sm text-muted hover:text-ink">
        ← Home
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {item.name}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {formatPrice(item.is_free, item.price)} ·{" "}
          {proximityLabel(
            profile.campus_area,
            areaOfPickup(item.pickup_location),
          )}
        </p>
      </div>

      <Countdown expiresAt={reservation.expires_at} />

      {expired ? (
        <div className="space-y-3">
          <Notice tone="danger">
            Reservation expired. The item is available again — someone else can
            claim it now.
          </Notice>
          <LinkButton href={`/items/${item.id}`} size="lg" full>
            Try claiming it again
          </LinkButton>
        </div>
      ) : (
        <>
          {/*
            Ten minutes is exactly when you want another look at the photo, or
            to ask whether it's the black one. Without these two the screen was
            a dead end with a clock on it.
          */}
          <Link
            href={`/items/${item.id}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card transition hover:-translate-y-0.5 hover:border-accent-line hover:shadow-lift"
          >
            <ItemThumb item={item} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{item.name}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                See the photo, condition and description
              </p>
            </div>
            <span className="shrink-0 text-accent">→</span>
          </Link>

          <Card className="space-y-2">
            <p className="text-[13px] text-faint">Where you&rsquo;ll meet</p>
            <p className="text-[15px] text-ink">
              {pickupLabel(item.pickup_location)}
            </p>
            <p className="text-[13px] leading-relaxed text-muted">
              Confirming creates the handoff and gives you both a 4-digit code.
              Money, if any, changes hands there — Passdown never touches it.
            </p>
          </Card>

          <ConfirmClaimForm reservationId={reservation.id} />

          {owner ? (
            <MessageButton
              otherId={owner.id}
              itemId={item.id}
              label={`Message ${owner.name.split(" ")[0]}`}
            />
          ) : null}

          <form action={releaseReservation}>
            <input type="hidden" name="reservation_id" value={reservation.id} />
            <SubmitButton
              variant="ghost"
              size="sm"
              full
              pendingLabel="Releasing…"
            >
              Changed my mind — give it back
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
