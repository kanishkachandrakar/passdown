import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ buttons */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS = {
  primary:
    "wash-accent text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface text-ink border border-line shadow-card hover:border-accent-line hover:shadow-lift",
  soft: "bg-accent-soft text-accent-strong border border-accent-line hover:bg-accent-glow",
  ghost: "text-muted hover:text-ink",
  danger: "bg-danger-soft text-danger border border-danger/20 hover:bg-danger/10",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-5 text-base",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; full?: boolean }) {
  return (
    <button
      {...props}
      className={cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  full,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; full?: boolean }) {
  return (
    <Link
      {...props}
      className={cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
    />
  );
}

/* -------------------------------------------------------------------- layout */

export function Card({
  className,
  as: As = "div",
  ...props
}: ComponentProps<"div"> & { as?: "div" | "article" | "section" }) {
  return (
    <As
      {...props}
      className={cx(
        "rounded-2xl border border-line bg-surface p-4 shadow-card",
        className
      )}
    />
  );
}

export function SectionHeading({
  title,
  action,
  hint,
}: {
  title: string;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-sm text-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="wash-soft border-dashed text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

/* --------------------------------------------------------------------- chips */

const CHIP_TONES = {
  neutral: "bg-canvas text-muted border-line",
  accent: "bg-accent-soft text-accent-strong border-accent-line",
  warn: "bg-warn-soft text-warn border-warn/20",
  danger: "bg-danger-soft text-danger border-danger/20",
} as const;

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_TONES;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        CHIP_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Honesty rule: any figure that comes from seeded data carries this label.
 * See CLAUDE.md — no invented traction anywhere in this project.
 */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-warn/25 bg-warn-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warn",
        className
      )}
    >
      Demo Campus Preview
    </span>
  );
}

/* -------------------------------------------------------------------- fields */

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const CONTROL =
  "w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink " +
  "placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cx(CONTROL, "h-11", className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cx(CONTROL, "h-11 appearance-none pr-9", className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(CONTROL, "min-h-20 py-2.5", className)} />;
}

/* -------------------------------------------------------------------- alerts */

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-canvas text-muted",
    accent: "border-accent-line bg-accent-soft text-accent-strong",
    warn: "border-warn/20 bg-warn-soft text-warn",
    danger: "border-danger/20 bg-danger-soft text-danger",
  } as const;

  return (
    <div className={cx("rounded-xl border px-3.5 py-3 text-sm", tones[tone])} role="status">
      {children}
    </div>
  );
}
