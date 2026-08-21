import { cx } from "@/components/ui";
import type { Item } from "@/lib/types";

/**
 * What a listing looks like before anyone uploads a photo.
 *
 * A photo is optional on release — the form takes sixty seconds partly because
 * it doesn't insist on one — so "no photo" is the normal case, not an error
 * state. A single letter in a grey box reads as a broken image; a drawing of
 * the category reads as deliberate.
 *
 * No stock photography: a picture of someone else's fridge standing in for
 * this fridge is a small lie, and the whole product rests on the listings
 * being trustworthy.
 */

const GLYPHS: Record<string, React.ReactNode> = {
  Dorm: (
    // bed
    <>
      <path d="M3 17v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
      <path d="M3 17h18M3 17v3M21 17v3M3 12V8" />
      <rect x="6" y="7" width="5" height="3" rx="1" />
    </>
  ),
  Electronics: (
    // monitor
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  Furniture: (
    // chair
    <>
      <path d="M6 4h12v7H6z" />
      <path d="M5 11h14M7 11v9M17 11v9M7 15h10" />
    </>
  ),
  Kitchen: (
    // pot
    <>
      <path d="M4 9h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9Z" />
      <path d="M2 9h20M8 6V4M16 6V4" />
    </>
  ),
  "Books & Study": (
    // book
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
    </>
  ),
  "Lab & Course Kit": (
    // flask
    <>
      <path d="M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" />
      <path d="M9 3h6M7.5 14h9" />
    </>
  ),
  Sports: (
    // ball
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c3 3 3 15 0 18M3.5 9h17M3.5 15h17" />
    </>
  ),
  Clothing: (
    // t-shirt
    <>
      <path d="M9 3 4 6l2 4 2-1v9h8v-9l2 1 2-4-5-3" />
      <path d="M9 3a3 3 0 0 0 6 0" />
    </>
  ),
  Other: (
    // box
    <>
      <path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
};

/**
 * Glyphs keyed off the item name, checked before the category.
 *
 * Without these, every listing in Dorm — fridge, lamp, hamper, bins — draws
 * the same bed, and a grid of twelve identical icons is barely better than a
 * grid of twelve letters.
 */
const NAME_GLYPHS: [RegExp, React.ReactNode][] = [
  [
    /fridge|freezer|cooler/,
    <>
      <rect key="b" x="6" y="2" width="12" height="20" rx="2" />
      <path key="d" d="M6 10h12M9 6v2M9 13v2" />
    </>,
  ],
  [
    /lamp|light/,
    <>
      <path key="s" d="M8 10h8l-2.5-6h-3L8 10Z" />
      <path key="p" d="M12 10v9M8 19h8" />
    </>,
  ],
  [
    /calculator/,
    <>
      <rect key="b" x="5" y="2" width="14" height="20" rx="2" />
      <path key="d" d="M8 6h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18.5h7" />
    </>,
  ],
  [
    /hamper|basket|laundry|bin/,
    <>
      <path key="b" d="M5 8h14l-1.5 12h-11L5 8Z" />
      <path key="d" d="M3 8h18M9.5 12v4M14.5 12v4" />
    </>,
  ],
  [
    /kettle|mug|cup|coffee/,
    <>
      <path key="b" d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
      <path key="h" d="M16 10h2a2 2 0 0 1 0 5h-2M8 5V3M13 5V3" />
    </>,
  ],
  [
    /textbook|book|notes/,
    <>
      <path key="b" d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path key="d" d="M5 17a3 3 0 0 1 3-3h11" />
    </>,
  ],
  [
    /monitor|screen|display|tv/,
    <>
      <rect key="b" x="3" y="4" width="18" height="12" rx="2" />
      <path key="d" d="M9 20h6M12 16v4" />
    </>,
  ],
  [
    /chair|stool/,
    <>
      <path key="b" d="M6 4h12v7H6z" />
      <path key="d" d="M5 11h14M7 11v9M17 11v9M7 15h10" />
    </>,
  ],
  [
    /mat|rug|yoga/,
    <>
      <rect key="b" x="3" y="7" width="18" height="10" rx="3" />
      <path key="d" d="M7 7v10M17 7v10" />
    </>,
  ],
  [
    /coat|jacket|shirt|hoodie/,
    <>
      <path key="b" d="M9 3 4 6l2 4 2-1v9h8v-9l2 1 2-4-5-3" />
      <path key="d" d="M9 3a3 3 0 0 0 6 0" />
    </>,
  ],
];

function glyphFor(name: string, category: string) {
  const lower = name.toLowerCase();
  for (const [pattern, glyph] of NAME_GLYPHS) {
    if (pattern.test(lower)) return glyph;
  }
  return GLYPHS[category] ?? GLYPHS.Other;
}

function Glyph({
  name,
  category,
  className,
}: {
  name: string;
  category: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {glyphFor(name, category)}
    </svg>
  );
}

/**
 * Square thumbnail for list and grid cards.
 *
 * `tone` picks the placeholder's colours rather than letting a caller pass
 * overriding classes: Tailwind resolves conflicts by stylesheet order, not by
 * the order classes appear in the attribute, so "border-accent-line
 * border-danger/20" is a coin flip.
 */
export function ItemThumb({
  item,
  tone = "accent",
}: {
  item: Item;
  tone?: "accent" | "danger";
}) {
  if (item.photo_url) {
    return (
      // Photos live in a Supabase storage bucket on a host that isn't known at
      // build time, so this stays a plain <img> rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.photo_url}
        alt=""
        className={cx(
          "h-16 w-16 shrink-0 rounded-xl border object-cover",
          tone === "danger" ? "border-danger/25" : "border-line"
        )}
      />
    );
  }

  return (
    <div
      className={cx(
        "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border",
        tone === "danger"
          ? "border-danger/25 bg-danger-soft"
          : "border-accent-line bg-accent-soft"
      )}
    >
      <Glyph
        name={item.name}
        category={item.category}
        className={cx("h-7 w-7", tone === "danger" ? "text-danger" : "text-accent")}
      />
    </div>
  );
}

/** Wide banner for the item detail screen. */
export function ItemHero({ item }: { item: Item }) {
  if (item.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.photo_url}
        alt={item.name}
        className="aspect-4/3 w-full rounded-2xl border border-line object-cover"
      />
    );
  }

  return (
    <div className="flex aspect-4/3 w-full items-center justify-center rounded-2xl border border-accent-line bg-accent-soft">
      <div className="text-center">
        <Glyph name={item.name} category={item.category} className="mx-auto h-16 w-16 text-accent" />
        <p className="mt-2 text-[13px] text-accent-strong">{item.category}</p>
        <p className="mt-0.5 text-[12px] text-muted">No photo added</p>
      </div>
    </div>
  );
}
