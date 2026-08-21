import Link from "next/link";

import { cx } from "@/components/ui";

/**
 * Browse filters, behind a button.
 *
 * Plain links inside a <details>, not a client component: the page already
 * receives searchParams, so every option can be rendered as the URL it leads
 * to. That keeps the screen server-rendered, makes a filtered view shareable,
 * makes the back button behave, and means the panel opens with no JavaScript.
 */

export type BrowseParams = {
  category?: string;
  sort?: string;
  listed?: string;
  price?: string;
  condition?: string;
};

const SORTS = [
  { value: "close", label: "Closest" },
  { value: "new", label: "Newest" },
  { value: "soon", label: "Leaving soon" },
];

const LISTED = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const PRICES = [
  { value: "any", label: "Any price" },
  { value: "free", label: "Free only" },
  { value: "paid", label: "For sale" },
];

const CONDITIONS = [
  { value: "any", label: "Any condition" },
  { value: "like_new", label: "Like new or better" },
  { value: "good", label: "Good or better" },
];

const DEFAULTS: Required<BrowseParams> = {
  category: "",
  sort: "close",
  listed: "any",
  price: "any",
  condition: "any",
};

/** The URL for this screen with one filter changed and the rest kept. */
export function browseHref(
  current: BrowseParams,
  key: keyof BrowseParams,
  value: string
) {
  const next = { ...DEFAULTS, ...current, [key]: value };
  const search = new URLSearchParams();

  for (const [k, v] of Object.entries(next)) {
    // defaults stay out of the URL, so an unfiltered Browse is just /browse
    if (v && v !== DEFAULTS[k as keyof BrowseParams]) search.set(k, v);
  }

  const query = search.toString();
  return query ? `/browse?${query}` : "/browse";
}

/** How many filters are doing something, for the badge on the button. */
export function activeCount(current: BrowseParams) {
  return (Object.keys(DEFAULTS) as (keyof BrowseParams)[]).filter(
    (k) => (current[k] ?? DEFAULTS[k]) !== DEFAULTS[k]
  ).length;
}

function Pill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cx(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
        active
          ? "border-accent bg-accent text-white shadow-card"
          : "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
      )}
    >
      {label}
    </Link>
  );
}

function Group({
  title,
  options,
  current,
  paramKey,
  activeValue,
}: {
  title: string;
  options: { value: string; label: string }[];
  current: BrowseParams;
  paramKey: keyof BrowseParams;
  activeValue: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill
            key={o.value}
            href={browseHref(current, paramKey, o.value)}
            label={o.label}
            active={activeValue === o.value}
          />
        ))}
      </div>
    </div>
  );
}

export function BrowseFilters({
  categories,
  current,
}: {
  categories: string[];
  current: BrowseParams;
}) {
  const count = activeCount(current);

  return (
    <details className="group relative">
      <summary
        className={cx(
          "inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
          "[&::-webkit-details-marker]:hidden",
          count > 0
            ? "border-accent bg-accent-soft text-accent-strong"
            : "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
        )}
      >
        {/* sliders icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Filter
        {count > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-white">
            {count}
          </span>
        ) : null}
        <span className="text-faint transition group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>

      {/*
        Anchored to the button on a wide screen; full width on a phone, where a
        floating panel would be narrower than the options inside it.
      */}
      <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3.5 rounded-2xl border border-line bg-surface p-4 shadow-lift sm:w-96">
        <Group
          title="Sort by"
          paramKey="sort"
          current={current}
          activeValue={current.sort ?? "close"}
          options={SORTS}
        />
        <Group
          title="Listed"
          paramKey="listed"
          current={current}
          activeValue={current.listed ?? "any"}
          options={LISTED}
        />
        <Group
          title="Price"
          paramKey="price"
          current={current}
          activeValue={current.price ?? "any"}
          options={PRICES}
        />
        <Group
          title="Condition"
          paramKey="condition"
          current={current}
          activeValue={current.condition ?? "any"}
          options={CONDITIONS}
        />
        <Group
          title="Category"
          paramKey="category"
          current={current}
          activeValue={current.category ?? ""}
          options={[
            { value: "", label: "All" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />

        {count > 0 ? (
          <div className="border-t border-line pt-3">
            <Link
              href="/browse"
              scroll={false}
              className="text-sm font-medium text-accent hover:text-accent-strong"
            >
              Clear all filters
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  );
}
