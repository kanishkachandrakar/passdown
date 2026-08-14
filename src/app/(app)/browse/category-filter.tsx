"use client";

import Link from "next/link";

import { cx } from "@/components/ui";

export function CategoryFilter({
  categories,
  active,
}: {
  categories: string[];
  active: string | null;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-2 pb-1">
        <Pill href="/browse" label="All" active={!active} />
        {categories.map((c) => (
          <Pill
            key={c}
            href={`/browse?category=${encodeURIComponent(c)}`}
            label={c}
            active={active === c}
          />
        ))}
      </div>
    </div>
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
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-muted hover:border-faint"
      )}
    >
      {label}
    </Link>
  );
}
