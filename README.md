# Passdown

**Your campus already has one.**

A campus-only, verified-student exchange for the things students are done with — so nobody buys a mini fridge that's sitting in a dorm 400 metres away.

Built for the Stellic Pathfinders Challenge 2026 · Category 02, Overcoming Obstacles.

---

## The loop

1. A student posts what they **need**
2. Another student **releases** what they're done with
3. Passdown **matches** them automatically and says why
4. The needer **claims** it — 10-minute lock, item unavailable to everyone else
5. Both get a pickup spot and a 4-digit code
6. Both confirm — done

## Why not Facebook Marketplace

It's city-wide and full of strangers. Passdown is scoped to one verified campus, so every item is a walk away and every user is a confirmed student. Every item and match card shows the walk time, and matches are sorted nearest first.

## Why not the campus group chat

A group chat has no state. The same fridge gets promised to four people and three get ghosted. Passdown enforces a single claim in Postgres — not in React.

That claim isn't a claim. It's tested:

```
npm run verify
```

10 rounds × 12 simultaneous `claim_item` calls from two students. Exactly one winner every round; every loser is told the item is gone.

---

## Running it

```bash
git clone <repo-url> && cd passdown
npm install
```

### Against a local database (no Supabase account needed)

Requires Docker.

```bash
npm run db:start        # starts Postgres, auth, storage; applies supabase/schema.sql
npm run dev
```

`db:start` prints an API URL, anon key and service role key. Put them in `.env.local` (see `.env.example`). Sign-in emails arrive in Mailpit at http://127.0.0.1:54324 — no real inbox needed. Each one carries a six-digit code *and* a one-tap link; either works.

If Next starts on 3001 because something already holds 3000, nothing needs changing — the link in the email is built from the origin the app is actually being served on.

### Against a hosted Supabase project

1. Create a project
2. Run `supabase/schema.sql` in the SQL editor, top to bottom
3. Copy `.env.example` to `.env.local` and fill in the URL and keys
4. Under **Authentication → URL Configuration**, add your deployed origin to the
   redirect allow-list as `https://your-app.vercel.app/**`, or the link in the
   sign-in email will be refused
5. Under **Authentication → Email Templates → Magic Link**, paste
   `supabase/templates/magic-link.html`. The stock template sends a link and no
   code, which leaves the verify screen asking for six digits nobody was sent
6. `npm run dev`

Optionally run `supabase/seed.sql` for the demand list on the home screen. Anything it feeds is labelled **Demo Campus Preview** in the UI.

## Verifying it

| Command | What it proves |
|---|---|
| `npm run verify` | 41 checks on the database: RLS isolation, matching, the concurrent-claim race, expiry, self-healing, handoff completion, housekeeping |
| `npm run verify:ui` | 41 checks on the rendered screens: proximity on every card, match reasons, the Demo Campus Preview label, the item flipping to unavailable in another student's tab |
| `npm run build` / `npm run lint` | types and lint |

`verify:ui` needs `npm run dev` running. Both scripts create and delete their own accounts, and `verify` refuses to run against anything but a local database.

## Demo accounts

Sign up through the app with any two addresses at the same institutional domain — the six-digit code is the whole flow. On the local stack the codes appear in Mailpit; nothing needs to be pre-created.

| Role | Suggested email | Set up as |
|---|---|---|
| Receiver | `demo.a@vit.ac.in` | Block A, with an open Need for a mini fridge |
| Releaser | `demo.b@vit.ac.in` | Block B, releases the fridge on camera |

Different blocks on purpose: that's what makes the walk time on the match card a real number.

## The two things worth looking at

**`supabase/schema.sql`** — `claim_item` takes a row lock, re-checks status inside the transaction, and a unique partial index allows one active reservation per item. It also expires a lapsed hold on the row it already has locked, so a claim is correct even if no cleanup has run in a month.

**`src/lib/matching.ts`** — plain scoring, no ML. Hard filters, then points for name closeness, category, free, condition, same block, and slack before the needed-by date. Threshold 40. The reasons it returns are what the student reads on the match card.

One of those hard filters is worth the sentence: the name has to be relevant. Category (20) + free (15) + date slack (5) is exactly the threshold, so without it a desk lamp "matches" a request for a mini fridge. One bad match costs more trust than ten missed good ones.

## Still working in a month

The demo is one afternoon; a student's account is a year. What keeps it honest with nobody watching:

- **Sessions** — the auth session is refreshed on every navigation in `src/proxy.ts`, so returning next term doesn't mean signing in again
- **Lapsed holds** — swept by `pg_cron` every minute, *and* healed inside `claim_item` itself, so a stuck `reserved` item can't outlive its ten minutes
- **Stale supply and demand** — items past their available-until and needs past their needed-by are expired automatically; both can be relisted or extended in one tap instead of retyped
- **No pg_cron?** — `GET /api/maintenance` does the same sweep, wired to a daily Vercel Cron in `vercel.json`

Note for a real pilot: Supabase pauses free-tier projects after a week of inactivity, and the built-in email sender is rate-limited — wire up your own SMTP before putting this in front of a hall of residence.

## Project layout

```
CLAUDE.md                instructions for Claude Code
docs/spec.md             full product spec
docs/tasks.md            day-by-day build plan
supabase/schema.sql      tables, RLS, grants, claim/handoff/maintenance functions
supabase/seed.sql        demo demand list (clearly labelled)
src/lib/matching.ts      the scoring function
src/lib/campus.ts        the campus map — walk times come from here
src/proxy.ts             session refresh and the auth guard
scripts/verify-loop.mjs  the database contract, including the claim race
scripts/verify-ui.mjs    every screen, signed in as a real student
scripts/screenshot-setup.mjs  seeds a realistic signed-in state for the demo
```

`screenshot-setup.mjs` builds a campus mid-loop — two students, three items, a
need with matches, one live hold and one arranged handoff — and prints the
session cookies and the paths worth capturing. Useful for the demo video, and
for checking every screen at 390px. `--clean` removes what it made.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (auth, Postgres, storage) · Vercel

No runtime dependencies beyond `next`, `react` and the two Supabase packages. The Supabase CLI is used through `npx` and never installed.

## A note on the numbers

Any figure that comes from seeded data is labelled **Demo Campus Preview**. Personal counts ("2 completed handoffs") are real and are the only counts shown. No invented traction appears anywhere in this project.
