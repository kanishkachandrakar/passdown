import Link from "next/link";

import { cx } from "@/components/ui";

/**
 * Browse filters.
 *
 * Plain links, not a client component: the page already receives searchParams,
 * so every option can be rendered as the URL it leads to. That keeps the whole
 * screen server-rendered, makes a filtered view shareable, and means the back
 * button behaves.
 */

export type BrowseParams = {
  category?: string;
  sort?: string;
  listed?: string;
  price?: string;
  condition?: string;
};

export const SORTS = [
  { value: "close", label: "Closest" },
  { value: "new", label: "Newest" },
  { value: "soon", label: "Leaving soon" },
];

export const LISTED = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export const PRICES = [
  { value: "any", label: "Any price" },
  { value: "free", label: "Free only" },
  { value: "paid", label: "For sale" },
];

export const CONDITIONS = [
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
export function browseHref(current: BrowseParams, key: keyof BrowseParams, value: string) {
  const next = { ...DEFAULTS, ...current, [key]: value };
  const search = new URLSearchParams();

  for (const [k, v] of Object.entries(next)) {
    // defaults stay out of the URL, so an unfiltered Browse is just /browse
    if (v && v !== DEFAULTS[k as keyof BrowseParams]) search.set(k, v);
  }

  const query = search.toString();
  return query ? `/browse?${query}` : "/browse";
}

export function isFiltered(current: BrowseParams) {
  return (Object.keys(DEFAULTS) as (keyof BrowseParams)[]).some(
    (k) => (current[k] ?? DEFAULTS[k]) !== DEFAULTS[k]
  );
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

function Row({
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
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
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
  const sort = current.sort ?? "close";
  const listed = current.listed ?? "any";
  const price = current.price ?? "any";
  const condition = current.condition ?? "any";

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card">
      <Row
        title="Category"
        paramKey="category"
        current={current}
        activeValue={current.category ?? ""}
        options={[{ value: "", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]}
      />

      <Row
        title="Sort by"
        paramKey="sort"
        current={current}
        activeValue={sort}
        options={SORTS}
      />

      <Row
        title="Listed"
        paramKey="listed"
        current={current}
        activeValue={listed}
        options={LISTED}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Row
          title="Price"
          paramKey="price"
          current={current}
          activeValue={price}
          options={PRICES}
        />
        <Row
          title="Condition"
          paramKey="condition"
          current={current}
          activeValue={condition}
          options={CONDITIONS}
        />
      </div>

      {isFiltered(current) ? (
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
  );
}
