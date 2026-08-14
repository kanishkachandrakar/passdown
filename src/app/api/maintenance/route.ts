import { NextResponse, type NextRequest } from "next/server";

import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/**
 * Time-based cleanup, for a platform scheduler.
 *
 * This is the belt to pg_cron's braces. If the database has pg_cron (it does
 * on Supabase — see supabase/schema.sql) the sweep already runs every minute
 * and this endpoint is redundant. It exists so the app is still correct on a
 * Postgres without pg_cron, wired to a Vercel Cron entry in vercel.json.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.MAINTENANCE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "MAINTENANCE_SECRET is not set on this deployment." },
      { status: 501 }
    );
  }

  const authorised =
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("secret") === secret;

  if (!authorised) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    const result = await runMaintenance();
    return NextResponse.json({ ok: true, ...(result as object) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sweep failed." },
      { status: 500 }
    );
  }
}
