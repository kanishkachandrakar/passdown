# CLAUDE.md

Read this first, every session. Then read `docs/spec.md` before writing any feature code.

## What this is

**Passdown** — a campus-only, verified-student exchange for things students are done with.
Tagline: *Your campus already has one.*

Built for the Stellic Pathfinders Challenge. Submission deadline **Aug 21, 2026**. Target submit date **Aug 20**.

## The one thing that matters

This full loop must work end to end before anything else is built:

1. Student A posts a Need
2. Student B releases a matching item
3. System auto-matches and notifies A
4. A claims → 10-minute reservation lock → item unavailable to everyone else
5. Both get handoff details + 4-digit code
6. Both confirm → complete

If a task doesn't serve those six steps, it waits.

## Positioning — keep this visible in the UI

Two incumbents exist. We beat them differently:

- **vs Facebook Marketplace:** it's city-wide and full of strangers. We're campus-scoped and verified. → *Always show distance/campus area on item and match cards. Sort matches by proximity.*
- **vs the campus free-and-for-sale group chat:** it has no state — the same fridge gets promised to four people. We have item states and a single-claim lock. → *The reservation lock must be visibly demonstrable: claim in one tab, item goes unavailable in another.*

These two proofs are the demo. Don't let them get buried.

## Hard rules

1. **Never fabricate traction.** No "25,000 items saved". Sample data is labelled **Demo Campus Preview** in the UI. Personal stats only ("2 completed handoffs").
2. **Single claim is enforced in Postgres**, not in React. Use the `claim_item` RPC. Two tabs clicking Claim must produce exactly one reservation.
3. **Email verification is not `.edu`-only.** Universities outside the US use other domains (vit.ac.in, unam.mx, etc.). Verify any institutional domain.
4. **Mobile-first.** Design at 390px and scale up.
5. **No new dependencies** without a reason written in the commit message.

## Do not build

delivery/shipping/storage · payments or escrow · bidding/offers/negotiation · star ratings · followers or social feed · admin dashboard · analytics · bundles · life-stage suggestions · "benefits"/meal-swipe screens · AI chatbot

**Overridden Aug 21:** messaging *was* on this list and has now been built,
deliberately, on the owner's call. Don't remove it as scope creep. It is kept
small on purpose — two people per thread, usually about one item, no groups, no
attachments, no presence. The pickup point and 4-digit code still do the
arranging; this exists for "is it still going?", the question that otherwise
pushes people off the platform to swap phone numbers.

Student profiles (`/students/[id]`) were added at the same time: trust record
plus their other listings. The "no followers or social feed" line still stands —
no bios, no follows, no ratings.

## Stack

Next.js (App Router) + TypeScript + Tailwind + Supabase (auth, Postgres, storage) + Vercel.
Schema lives in `supabase/schema.sql`. Matching logic in `src/lib/matching.ts`.

## Conventions

- Server Components by default; `"use client"` only where interaction requires it
- Data access through `src/lib/supabase/{client,server}.ts` — no raw `createClient` calls in components
- Types generated from the DB, not hand-written duplicates
- Tailwind only, no CSS modules
- One accent colour, defined once. Tailwind v4 is CSS-first and has no
  `tailwind.config.ts` — the tokens live in the `@theme` block at the top of
  `src/app/globals.css`

## Commit discipline

Commit several times a day with real messages. The competition requires the project to be built between Jul 20 and Aug 21 — the commit history is the evidence. Never squash the week into one commit.

## Current status

Update this line as you go so future sessions know where things stand.

> **Status:** the full loop is built and verified end to end. Every screen in
> the spec exists; matching, the 10-minute lock, handoff codes and both-sides
> confirm all work against real Postgres. `npm run verify` (67 database checks,
> including 10 rounds of 12 simultaneous claims) and `npm run verify:ui` (65 screen checks) both pass, as do `npm run build` and `npm run lint`.
>
> Not done: deploy to Vercel with a hosted Supabase project, and the Aug 18–19
> items — real pilot, demo video, write-up. Nothing is blocked on code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
