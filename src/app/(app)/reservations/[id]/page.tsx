import { notFound } from "next/navigation";

import { ConfirmClaimForm } from "@/components/confirm-claim-form";
import { Countdown } from "@/components/countdown";
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
    .select("*, items(*)")
    .eq("id", id)
    .eq("claimant_id", profile.id)
    .maybeSingle();

  if (!reservation || !reservation.items) notFound();

  const item = reservation.items;
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
    <div className="space-y-5 pd-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {item.name}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {formatPrice(item.is_free, item.price)} ·{" "}
          {proximityLabel(profile.campus_area, areaOfPickup(item.pickup_location))}
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

          <form action={releaseReservation}>
            <input type="hidden" name="reservation_id" value={reservation.id} />
            <SubmitButton variant="ghost" size="sm" full pendingLabel="Releasing…">
              Changed my mind — give it back
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
