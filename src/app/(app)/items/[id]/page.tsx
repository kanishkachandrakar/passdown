import Link from "next/link";
import { notFound } from "next/navigation";

import { ClaimForm } from "@/components/claim-form";
import { ItemHero } from "@/components/item-thumb";
import { MessageButton } from "@/components/message-button";
import { LiveRefresh } from "@/components/live-refresh";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, LinkButton, Notice } from "@/components/ui";
import { relistItem, withdrawItem } from "@/lib/actions/items";
import { areaOfPickup, pickupLabel, proximityLabel } from "@/lib/campus";
import {
  availabilityLabel,
  formatDate,
  formatPrice,
  ITEM_STATUS_LABEL,
} from "@/lib/format";
import { requireProfile } from "@/lib/session";
import { CONDITION_LABEL } from "@/lib/types";

export const metadata = { title: "Item — Passdown" };

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: item } = await supabase
    .from("items")
    .select(
      "*, owner:profiles!items_owner_id_fkey(id, name, campus_area, successful_handoffs)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!item) notFound();

  const owner = item.owner as {
    id: string;
    name: string;
    campus_area: string | null;
    successful_handoffs: number;
  } | null;

  const isMine = item.owner_id === profile.id;
  const itemArea = areaOfPickup(item.pickup_location);

  // Is this item being held right now, and by whom?
  const { data: reservation } = await supabase
    .from("reservations")
    .select("*")
    .eq("item_id", id)
    .eq("status", "active")
    .maybeSingle();

  const heldByMe = reservation?.claimant_id === profile.id;

  // Why this landed in front of me, if it did.
  const { data: match } = await supabase
    .from("matches")
    .select("*, needs!inner(id, item_name, user_id)")
    .eq("item_id", id)
    .eq("needs.user_id", profile.id)
    .order("match_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reasons = (match?.reasons as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-5 pd-in">
      {/* Keeps this page honest while another tab is claiming the same item. */}
      <LiveRefresh intervalMs={3000} />

      <Link href="/home" className="text-sm text-muted hover:text-ink">
        ← Home
      </Link>

      <ItemHero item={item} />

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-ink">
            {item.name}
          </h1>
          <span className="shrink-0 text-xl font-semibold text-accent">
            {formatPrice(item.is_free, item.price)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Chip tone={item.status === "available" ? "accent" : "warn"}>
            {ITEM_STATUS_LABEL[item.status]}
          </Chip>
          <Chip>{CONDITION_LABEL[item.condition]}</Chip>
          <Chip>{item.category}</Chip>
        </div>
      </div>

      {item.is_demo ? (
        <Notice tone="warn">
          Sample listing, seeded so Browse isn&rsquo;t empty on a fresh install.
          It behaves exactly like a real one — you can claim it and the lock
          works — but nobody is actually waiting to hand it over.
        </Notice>
      ) : null}

      <Card className="space-y-2.5">
        <Row
          label="Distance"
          value={proximityLabel(profile.campus_area, itemArea)}
        />
        <Row label="Pickup point" value={pickupLabel(item.pickup_location)} />
        <Row
          label="Available until"
          value={`${formatDate(item.available_until)} · ${availabilityLabel(item.available_until)}`}
        />
        {isMine ? (
          <Row label="Released by" value="You" />
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <span className="shrink-0 text-[13px] text-faint">Student</span>
            <Link
              href={`/students/${owner?.id}`}
              className="text-right text-[15px] text-ink underline decoration-line underline-offset-2 hover:text-accent"
            >
              {owner?.name ?? "A student"} · Verified ✓ ·{" "}
              {owner?.successful_handoffs ?? 0} completed
            </Link>
          </div>
        )}
      </Card>

      {!isMine && owner ? (
        <MessageButton
          otherId={owner.id}
          itemId={item.id}
          label={`Message ${owner.name.split(" ")[0]}`}
        />
      ) : null}

      {item.description ? (
        <Card>
          <p className="text-[15px] leading-relaxed text-muted">
            {item.description}
          </p>
        </Card>
      ) : null}

      {reasons.length > 0 && !isMine ? (
        <div>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
            Why you&rsquo;re seeing this
          </h2>
          <Card className="space-y-1.5">
            {reasons.map((reason) => (
              <p key={reason} className="flex gap-2 text-[15px] text-ink">
                <span className="text-accent">✓</span>
                {reason}
              </p>
            ))}
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------- what now? */}

      {isMine ? (
        <OwnerActions status={item.status} itemId={item.id} />
      ) : heldByMe && reservation ? (
        <div className="space-y-2">
          <Notice tone="warn">
            You&rsquo;re holding this right now. Confirm before your ten minutes
            run out.
          </Notice>
          <LinkButton href={`/reservations/${reservation.id}`} size="lg" full>
            Go to your reservation
          </LinkButton>
        </div>
      ) : item.status === "available" ? (
        <ClaimForm itemId={item.id} />
      ) : (
        <UnavailableNotice status={item.status} />
      )}

      {!isMine && item.status === "available" ? (
        <p className="px-1 text-center text-[13px] leading-relaxed text-faint">
          Claiming holds it for ten minutes and takes it off everyone
          else&rsquo;s screen. Nobody else can claim it while you decide.
        </p>
      ) : null}
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

function UnavailableNotice({ status }: { status: string }) {
  const copy: Record<string, string> = {
    reserved:
      "Another student claimed this. They have ten minutes to confirm — if they don't, it comes back automatically.",
    claimed: "This one's been claimed and the handoff is arranged.",
    completed: "This has already been passed down.",
    expired: "This listing has lapsed.",
  };

  return (
    <Notice tone={status === "reserved" ? "warn" : "neutral"}>
      {copy[status] ?? "This item isn't available."}
    </Notice>
  );
}

function OwnerActions({ status, itemId }: { status: string; itemId: string }) {
  if (status === "available") {
    return (
      <form action={withdrawItem}>
        <input type="hidden" name="item_id" value={itemId} />
        <SubmitButton
          variant="secondary"
          size="lg"
          full
          pendingLabel="Removing…"
        >
          Take it off the board
        </SubmitButton>
      </form>
    );
  }

  if (status === "expired") {
    return (
      <div className="space-y-2">
        <Notice>
          This lapsed. Relisting puts it back for another 30 days.
        </Notice>
        <form action={relistItem}>
          <input type="hidden" name="item_id" value={itemId} />
          <SubmitButton size="lg" full pendingLabel="Relisting…">
            Relist it
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (status === "reserved") {
    return <Notice tone="warn">Someone is holding this right now.</Notice>;
  }

  return (
    <Notice>{ITEM_STATUS_LABEL[status as never] ?? "No action needed."}</Notice>
  );
}
