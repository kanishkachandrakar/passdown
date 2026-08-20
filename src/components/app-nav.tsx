"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/profile", label: "Profile" },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Thumb-reach navigation, phones only. On a laptop a bar pinned to the bottom
 * of a 1400px window is a long way from anything you were looking at, so the
 * same links move into the header instead.
 */
export function AppNav() {
  const isActive = useActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-md">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex-1 px-3 py-3.5 text-center text-[13px] font-medium transition",
                active ? "text-accent" : "text-faint hover:text-muted"
              )}
            >
              {tab.label}
              <span
                className={cx(
                  "mx-auto mt-1 block h-0.5 w-6 rounded-full",
                  active ? "bg-accent" : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** The same links, inline in the header, from md upwards. */
export function HeaderNav() {
  const isActive = useActive();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-1.5 text-[14px] font-medium transition",
              active
                ? "bg-accent-soft text-accent-strong"
                : "text-muted hover:bg-canvas hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
