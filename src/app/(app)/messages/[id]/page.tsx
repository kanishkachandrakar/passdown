import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ItemThumb } from "@/components/item-thumb";
import { LiveRefresh } from "@/components/live-refresh";
import { MessageComposer } from "@/components/message-composer";
import { Notice } from "@/components/ui";
import { markRead } from "@/lib/actions/messages";
import { requireProfile } from "@/lib/session";
import type { Item, Profile } from "@/lib/types";

export const metadata = { title: "Conversation — Passdown" };

export default async function ConversationPage({
  params,
}: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "*, items(*), a:profiles!conversations_user_a_fkey(id, name, avatar_url, campus_area, successful_handoffs), b:profiles!conversations_user_b_fkey(id, name, avatar_url, campus_area, successful_handoffs)"
    )
    .eq("id", id)
    .maybeSingle();

  // RLS already hides other people's threads; this turns that into a 404
  // rather than an empty screen.
  if (!conversation) notFound();

  const other = (
    conversation.user_a === profile.id ? conversation.b : conversation.a
  ) as Pick<Profile, "id" | "name" | "avatar_url" | "successful_handoffs"> | null;

  const item = conversation.items as Item | null;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  // Opening the thread is what marks it read.
  await markRead(id);

  const { data: block } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", profile.id)
    .eq("blocked_id", other?.id ?? "")
    .maybeSingle();

  const iBlockedThem = Boolean(block);

  return (
    <div className="mx-auto flex max-w-lg flex-col pd-in">
      <LiveRefresh intervalMs={4000} />

      <Link href="/messages" className="text-sm text-muted hover:text-ink">
        ← Messages
      </Link>

      <Link
        href={`/students/${other?.id}`}
        className="mt-4 flex items-center gap-3"
      >
        <Avatar name={other?.name ?? "?"} url={other?.avatar_url} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-ink">
            {other?.name ?? "A student"}
          </p>
          <p className="text-[13px] text-faint">
            Verified ✓ · {other?.successful_handoffs ?? 0} completed handoffs
          </p>
        </div>
      </Link>

      {item ? (
        <Link
          href={`/items/${item.id}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-accent-line wash-soft p-3 transition hover:shadow-card"
        >
          <ItemThumb item={item} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent-strong">
              About this item
            </p>
            <p className="mt-0.5 truncate font-medium text-ink">{item.name}</p>
          </div>
          <span className="shrink-0 text-accent">→</span>
        </Link>
      ) : null}

      <ul className="mt-4 space-y-2">
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === profile.id;
          return (
            <li
              key={m.id}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed " +
                  (mine
                    ? "wash-accent text-white"
                    : "border border-line bg-surface text-ink shadow-card")
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={
                    "mt-1 text-[11px] " + (mine ? "text-white/70" : "text-faint")
                  }
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {(messages ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          No messages yet. Say hello.
        </p>
      ) : null}

      <div className="mt-5">
        {iBlockedThem ? (
          <Notice tone="warn">
            You&rsquo;ve blocked this student, so neither of you can send
            messages. Unblock them from{" "}
            <Link href={`/students/${other?.id}`} className="underline">
              their profile
            </Link>
            .
          </Notice>
        ) : (
          <MessageComposer conversationId={id} name={other?.name ?? "them"} />
        )}
      </div>

      <p className="mt-3 px-1 text-center text-[12px] leading-relaxed text-faint">
        Passdown never shares phone numbers or email addresses. Arrange the
        handover at the pickup point and confirm with the 4-digit code.
      </p>
    </div>
  );
}
