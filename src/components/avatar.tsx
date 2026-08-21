import { cx } from "@/components/ui";

/**
 * A student's picture, or their initial.
 *
 * Uploading one is optional and always will be — plenty of people won't, and a
 * blank grey circle would make them look like a lesser account. The initial on
 * an accent tint is a deliberate design, not a placeholder.
 */

const SIZES = {
  sm: "h-8 w-8 text-[13px]",
  md: "h-11 w-11 text-[15px]",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cx(
    "shrink-0 rounded-full border border-accent-line object-cover",
    SIZES[size],
    className
  );

  if (url) {
    return (
      // Avatars live in a Supabase storage bucket on a host that isn't known at
      // build time, so this stays a plain <img> rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={base} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        base,
        "flex items-center justify-center bg-accent-soft font-semibold text-accent-strong"
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
