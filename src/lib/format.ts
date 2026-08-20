import type { ItemStatus, NeedStatus } from "./types";

/**
 * Currency, in one place. A campus that uses something else changes these two
 * lines and nothing else — every price in the app runs through formatPrice.
 */
export const CURRENCY = { symbol: "$", locale: "en-US" } as const;

export function formatPrice(isFree: boolean, price: number | string): string {
  if (isFree) return "Free";
  const n = typeof price === "string" ? Number(price) : price;
  return `${CURRENCY.symbol}${n.toLocaleString(CURRENCY.locale, {
    maximumFractionDigits: 0,
  })}`;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "No date set";
  return DATE_FMT.format(new Date(`${iso}T00:00:00`));
}

/** Whole days from today to a date-only string. Negative means in the past. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(`${iso}T00:00:00`);
  return Math.round((then.getTime() - today.getTime()) / 86_400_000);
}

/** "Available until 28 Aug · 5 days left" / "Lapsed 2 days ago" */
export function availabilityLabel(availableUntil: string): string {
  const days = daysUntil(availableUntil);
  if (days === null) return "";
  if (days < 0) return `Lapsed ${Math.abs(days)} ${plural(Math.abs(days), "day")} ago`;
  if (days === 0) return "Last day — today";
  if (days === 1) return "Last day — tomorrow";
  return `${days} days left`;
}

export function plural(n: number, word: string, suffix = "s") {
  return n === 1 ? word : `${word}${suffix}`;
}

/**
 * Has a timestamp passed? Lives here rather than inline in a page because
 * reading the clock during a render is exactly the kind of impurity React
 * warns about, and this is shared by three screens anyway.
 */
export function hasLapsed(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  claimed: "Claimed",
  completed: "Passed down",
  expired: "Lapsed",
};

export const NEED_STATUS_LABEL: Record<NeedStatus, string> = {
  open: "Open",
  matched: "Matched",
  fulfilled: "Fulfilled",
  expired: "Date passed",
  cancelled: "Cancelled",
};

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
