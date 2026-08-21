import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice } from "@/components/ui";
import { updateNeed } from "@/lib/actions/needs";
import { requireProfile } from "@/lib/session";
import { CATEGORIES, CONDITIONS } from "@/lib/types";
import { NeedForm } from "../../../need/new/need-form";

export const metadata = { title: "Edit need — Passdown" };

export default async function EditNeedPage({
  params,
}: PageProps<"/needs/[id]/edit">) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: need } = await supabase
    .from("needs")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!need) notFound();

  // A need that already led to a claim is part of a handoff's history.
  const editable = need.status === "open" || need.status === "expired";

  return (
    <div className="mx-auto max-w-lg pd-in">
      <Link href={`/needs/${id}`} className="text-sm text-muted hover:text-ink">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        Edit your need
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
        Change anything and we&rsquo;ll look again straight away — including at
        things already on the board.
      </p>

      {editable ? (
        <NeedForm
          categories={[...CATEGORIES]}
          conditions={CONDITIONS}
          action={updateNeed}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          defaults={{
            id: need.id,
            item_name: need.item_name,
            category: need.category,
            free_only: need.free_only,
            max_price: need.max_price,
            needed_by: need.needed_by,
            preferred_condition: need.preferred_condition,
          }}
        />
      ) : (
        <div className="mt-6">
          <Notice tone="warn">
            This need has already been matched to something you claimed, so it
            can&rsquo;t be edited. Post a new one if you&rsquo;re after something
            else.
          </Notice>
        </div>
      )}
    </div>
  );
}
