import { NextResponse, type NextRequest } from "next/server";

import { localInboxUrl } from "@/lib/local-dev";

export const dynamic = "force-dynamic";

/**
 * Reads the six-digit sign-in code straight out of the local mail catcher, so
 * the verify screen can show it.
 *
 * Purely a convenience for evaluating the project: on a local install no email
 * is actually sent, and asking someone to open a second tool and dig through
 * an inbox is a poor first thirty seconds.
 *
 * This cannot exist in production. `localInboxUrl()` is derived from the
 * Supabase URL and returns null for any non-local host, so a deployed build
 * answers 404 here — there is no configuration to get wrong.
 */
export async function GET(request: NextRequest) {
  const inbox = localInboxUrl();
  if (!inbox) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email")?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  try {
    const list = await fetch(`${inbox}/api/v1/messages?limit=25`, {
      cache: "no-store",
    });
    if (!list.ok) throw new Error(String(list.status));

    const { messages = [] } = (await list.json()) as {
      messages?: { ID: string; To?: { Address?: string }[] }[];
    };

    const match = messages.find((m) =>
      m.To?.some((t) => t.Address?.toLowerCase() === email)
    );
    if (!match) return NextResponse.json({ code: null });

    const detail = await fetch(`${inbox}/api/v1/message/${match.ID}`, {
      cache: "no-store",
    });
    const body = (await detail.json()) as { Text?: string; HTML?: string };
    const code = `${body.Text ?? ""}\n${body.HTML ?? ""}`.match(
      /(?<!\d)\d{6}(?!\d)/
    )?.[0];

    return NextResponse.json({ code: code ?? null });
  } catch {
    // The mail catcher isn't running, or moved. Not worth an error state —
    // the student can still type the code themselves.
    return NextResponse.json({ code: null });
  }
}
