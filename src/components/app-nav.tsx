"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/profile", label: "Profile" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md sm:max-w-lg">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
