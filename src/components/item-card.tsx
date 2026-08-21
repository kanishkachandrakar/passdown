import Link from "next/link";

import { ItemThumb } from "@/components/item-thumb";
import { Chip } from "@/components/ui";
import { pickupProximityLine } from "@/lib/campus";
import { availabilityLabel, formatPrice, ITEM_STATUS_LABEL } from "@/lib/format";
import { CONDITION_LABEL, type Item } from "@/lib/types";

const STATUS_TONE = {
  available: "accent",
  reserved: "warn",
  claimed: "warn",
  completed: "neutral",
  expired: "neutral",
} as const;

/**
 * Proximity is on every card, every time. That is the whole argument against
 * a city-wide marketplace, so it does not get to be an optional detail.
 */
export function ItemCard({
  item,
  viewerArea,
  href,
}: {
  item: Item;
  viewerArea: string | null;
  href?: string;
}) {
  const unavailable = item.status !== "available";

  const body = (
    <div className="flex gap-3">
      <ItemThumb item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[15px] font-medium text-ink">{item.name}</p>
          <span className="shrink-0 text-[15px] font-semibold text-accent">
            {formatPrice(item.is_free, item.price)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[13px] text-muted">
          {pickupProximityLine(viewerArea, item.pickup_location)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {unavailable ? (
            <Chip tone={STATUS_TONE[item.status]}>{ITEM_STATUS_LABEL[item.status]}</Chip>
          ) : (
            <Chip tone="accent">{ITEM_STATUS_LABEL.available}</Chip>
          )}
          <Chip>{CONDITION_LABEL[item.condition]}</Chip>
          <Chip>{availabilityLabel(item.available_until)}</Chip>
        </div>
      </div>
    </div>
  );

  const className =
    "block rounded-2xl border border-line bg-surface p-3 shadow-card transition " +
    "hover:-translate-y-0.5 hover:border-accent-line hover:shadow-lift";

  if (!href) return <div className={className}>{body}</div>;

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

