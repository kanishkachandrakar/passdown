import Link from "next/link";

import { LiveRefresh } from "@/components/live-refresh";
import { Chip, EmptyState, LinkButton } from "@/components/ui";
import { requireProfile } from "@/lib/session";
import type { Item, Profile } from "@/lib/types";

export const metadata = { title: "Messages — Passdown" };

type Row = {
  id: string;
  item_id: string | null;
  user_a: string;
  user_b: string;
  last_message_at: string;
  items: Pick<Item, "name" | "photo_url" | "category"> | null;
  a: Pick<Profile, "id" | "name"> | null;
  b: Pick<Profile, "id" | "name"> | null;
};

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default async function MessagesPage() {
  const { profile, supabase } = await requireProfile();

  // RLS limits this to threads you're in, so no filter is needed here.
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, item_id, user_a, user_b, last_message_at, items(name, photo_url, category), a:profiles!conversations_user_a_fkey(id, name), b:profiles!conversations_user_b_fkey(id, name)"
    )
    .order("last_message_at", { ascending: false })
    .limit(50);

  const conversations = (data as Row[] | null) ?? [];

  // Last line and unread count per thread, in one query rather than N.
  const ids = conversations.map((c) => c.id);
  const { data: msgs } = ids.length
    ? await supabase
        .from("messages")
        .select("conversation_id, body, sender_id, created_at, read_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latest = new Map<string, { body: string; mine: boolean }>();
  const unread = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (!latest.has(m.conversation_id)) {
      latest.set(m.conversation_id, {
        body: m.body,
        mine: m.sender_id === profile.id,
      });
    }
    if (m.sender_id !== profile.id && !m.read_at) {
      unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pd-in">
      <LiveRefresh intervalMs={6000} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Messages</h1>
        <p className="mt-1 text-[15px] text-muted">
          For the quick question before you claim. The pickup point and the
          4-digit code still do the arranging.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No messages"
          body="Open an item and tap Message if you need to ask the student something before claiming it."
          action={
            <LinkButton href="/browse" variant="soft" size="sm">
              Browse what&rsquo;s on campus
            </LinkButton>
          }
        />
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const other = c.user_a === profile.id ? c.b : c.a;
            const last = latest.get(c.id);
            const count = unread.get(c.id) ?? 0;

            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="block rounded-2xl border border-line bg-surface p-3.5 shadow-card transition hover:-translate-y-0.5 hover:border-accent-line hover:shadow-lift"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium text-ink">
                      {other?.name ?? "A student"}
                    </p>
                    <span className="shrink-0 text-[12px] text-faint">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>

                  {c.items ? (
                    <p className="mt-0.5 truncate text-[13px] text-accent-strong">
                      About: {c.items.name}
                    </p>
                  ) : null}

                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-[14px] text-muted">
                      {last
                        ? `${last.mine ? "You: " : ""}${last.body}`
                        : "No messages yet"}
                    </p>
                    {count > 0 ? (
                      <Chip tone="accent" className="shrink-0">
                        {count} new
                      </Chip>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
