# Passdown

**Your campus already has one.**

A campus-only, verified-student exchange for the things students are done with — so nobody buys a mini fridge that's sitting in a dorm 400 metres away.

Built for the Stellic Pathfinders Challenge 2026 · Category 02, Overcoming Obstacles.

---

## The loop

1. A student posts what they **need**
2. Another student **releases** what they're done with
3. Passdown **matches** them automatically
4. The needer **claims** it — 10-minute lock, item unavailable to everyone else
5. Both get a pickup spot and a 4-digit code
6. Both confirm — done

## Why not Facebook Marketplace

It's city-wide and full of strangers. Passdown is scoped to one verified campus, so every item is a walk away and every user is a confirmed student.

## Why not the campus group chat

A group chat has no state. The same fridge gets promised to four people and three get ghosted. Passdown enforces a single claim at the database level.

---

## Running locally

```bash
git clone <repo-url> && cd passdown
npm install
cp .env.example .env.local     # fill in your Supabase keys
npm run dev
```

Then in the Supabase SQL editor, run `supabase/schema.sql`, and optionally `supabase/seed.sql`.

## Demo accounts

| Role | Email | Notes |
|------|-------|-------|
| Receiver | _fill in_ | has an open Need for a mini fridge |
| Releaser | _fill in_ | releases the fridge to trigger the match |

Sign in with the email OTP flow.

## Project layout

```
CLAUDE.md              instructions for Claude Code
docs/spec.md           full product spec
docs/tasks.md          day-by-day build plan
supabase/schema.sql    tables, RLS, claim/handoff functions
supabase/seed.sql      demo data (clearly labelled)
src/lib/matching.ts    the scoring function
```

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (auth, Postgres, storage) · Vercel

## A note on the numbers

Any figures shown on a seeded environment are labelled **Demo Campus Preview**. No invented traction appears anywhere in this project.
