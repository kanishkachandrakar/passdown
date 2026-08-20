# Running Passdown for real

Not the demo. This is what to do before actual students sign up and hand real
things to each other.

The local stack (`npm run db:start`) is for development and for filming. It runs
in Docker on one machine, sends no real email, and disappears when you stop it.
Everything below replaces it.

---

## Before you deploy: three things that are still demo data

These are in the code, not the database, so they ship with the build. Fix them
first or your first real user sees a fictional campus.

### 1. The campus map — `src/lib/campus.ts`

Walk times on every card are computed from coordinates in this file, and the
coordinates are an invented campus. Replace `CAMPUS_AREAS` and
`PICKUP_LOCATIONS` with your institution's real buildings.

Coordinates are plain metres on a flat grid — pick any fixed point as the
origin (the main gate works) and measure east/north from it. Google Maps
right-click → "Measure distance" is accurate enough; a campus is small enough
that the curvature of the earth does not matter.

```ts
export const CAMPUS_AREAS: CampusArea[] = [
  { id: "hostel-1", label: "Hostel 1", x: 0,   y: 0   },
  { id: "hostel-2", label: "Hostel 2", x: 180, y: 40  },
  { id: "library",  label: "Library",  x: 320, y: 260 },
  // ...
];
```

Rules that matter:

- `PICKUP_LOCATIONS[].areaId` must reference a real `CAMPUS_AREAS[].id`
- `id` values are stored in the database (`items.pickup_location`,
  `profiles.campus_area`). Changing an `id` after people have used the app
  orphans their rows — add new ones, don't rename old ones
- `WALK_PACE` is 78 m/min. Lower it for a hilly campus

### 2. Currency — `src/lib/format.ts`

Prices are US dollars, set by the `CURRENCY` constant in this file. Every
price in the app runs through `formatPrice`, so a campus using something else
changes the symbol and locale there and nowhere else.

### 3. Do **not** seed sample data

That means both `supabase/seed.sql` and `npm run seed:demo`.

`seed.sql` populates "Students near you need"; `seed:demo` creates three sample
students and twelve sample listings so Browse isn't empty. Both exist so a
fresh install has something to look at, and both are labelled in the UI
precisely because they are fictional.

On a real deployment, seed neither. An empty Browse on day one is the honest
state, and the home screen hides the demand section entirely when there are no
rows. If you did seed a production database by accident, `npm run seed:demo --
--clean --domain=your-uni.edu` removes the accounts and their listings, and
`delete from demo_demand;` clears the rest.

With nothing seeded, the **Demo / Real** switch doesn't render either — there
is no sample data to switch between.

---

## Step 1 — Create the Supabase project

1. https://supabase.com/dashboard → **New project**
2. Pick the region closest to your campus. This is the single biggest lever on
   how fast the app feels, and it cannot be changed later
3. Save the database password somewhere real

## Step 2 — Create the schema

**SQL Editor** → paste all of `supabase/schema.sql` → **Run**.

It is safe to re-run. It creates tables, RLS policies, grants, the claim and
handoff functions, the maintenance functions, and the `item-photos` storage
bucket.

Then confirm the parts that fail silently if they didn't take:

```sql
-- 1. the scheduled sweep exists
select jobname, schedule from cron.job;
--    expect: passdown-maintenance | * * * * *

-- 2. the storage bucket exists and is public
select id, public from storage.buckets where id = 'item-photos';
--    expect: item-photos | t

-- 3. RLS is on everywhere
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
--    expect: rowsecurity = true on all seven tables
```

If `cron.job` errors with "relation does not exist", pg_cron isn't installed.
Go to **Database → Extensions**, enable `pg_cron`, and re-run `schema.sql`.
It is not fatal if you can't — see *If pg_cron is unavailable* at the bottom.

## Step 3 — Configure auth

Two settings, both of which produce a broken sign-in if skipped. This is the
step people lose an evening to.

**Authentication → URL Configuration**

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

Without the wildcard entry, the link in the sign-in email is refused and the
student lands on an error page.

**Authentication → Email Templates → Magic Link**

Replace the body with the contents of `supabase/templates/magic-link.html`.

Supabase's stock template sends a link and *no code*. Passdown's verify screen
asks for six digits, so with the stock template a student is asked for
something they were never sent. The template ships both: the code and a
one-tap link.

## Step 4 — Set up real email (do not skip)

Supabase's built-in sender is for development. On a new project it is limited
to a handful of messages per hour and is not intended for real recipients.
A hall of residence signing up at once will hit that wall in about ninety
seconds, and every one of them just sees "check your email" and nothing
arriving.

**Authentication → Emails → SMTP Settings** → enable custom SMTP.

Resend, Postmark, SendGrid and Amazon SES all work. You will need to verify a
sending domain — allow a day for DNS to propagate, so start this before the
day you need it, not on it.

Then raise the limit under **Authentication → Rate Limits**: the default for
email sends is deliberately low, and it applies even once your own SMTP is
doing the sending.

Send yourself a test sign-in before trusting it.

## Step 5 — Deploy to Vercel

The repo is already on GitHub.

1. https://vercel.com/new → import `kanishkachandrakar/passdown`
2. Framework preset: **Next.js**. Everything else default
3. Add these four environment variables, for **Production** *and* **Preview**:

| Name | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → service_role key |
| `MAINTENANCE_SECRET` | invent one: `openssl rand -hex 32` |

4. Deploy

Two things about those keys:

- The `NEXT_PUBLIC_` ones are baked in at build time. Change them later and you
  must **redeploy**, not just restart
- `SUPABASE_SERVICE_ROLE_KEY` bypasses every RLS policy you wrote. It is used
  in exactly one place — scoring a released item against other students' needs,
  which are private to them. Never expose it to the browser, never prefix it
  with `NEXT_PUBLIC_`

Once the first deploy gives you a real URL, **go back to Step 3** and put that
URL into Site URL and Redirect URLs. You could not know it before now.

## Step 6 — Confirm the cleanup job runs

`vercel.json` already registers a daily call to `/api/maintenance`. Check it
appears under **Vercel → your project → Cron Jobs**, then prove the endpoint
works:

```bash
curl -H "Authorization: Bearer $MAINTENANCE_SECRET" \
  https://your-app.vercel.app/api/maintenance
# {"ok":true,"reservations_expired":0,"items_expired":0,"needs_expired":0}
```

A 401 means `MAINTENANCE_SECRET` differs between your shell and Vercel. A 501
means it isn't set on the deployment at all.

Note the daily cron is a *backstop*. Ten-minute reservations need sweeping far
more often than daily — that is pg_cron's job, every minute. And even if both
fail, `claim_item` expires a lapsed hold on the row it already has locked, so
a claim is never wrong. Three layers, deliberately.

## Step 7 — Walk the loop on the live URL

Not the local one. Use two accounts at the same institutional domain, on two
devices or one plus a private window, **in different campus areas** so the walk
time is a real number.

1. A: sign up → check the email actually arrives → verify → pick a block
2. A: post a need
3. B: sign up in the other browser, different block
4. B: release something matching → confirm the "*N* students already need this"
   count appears
5. A: the need shows a match, with reasons and a walk time
6. Open the item in **both** browsers. Claim in A's
7. **B's tab flips to Reserved within about three seconds, untouched.** If this
   doesn't happen, stop and investigate — it is the core promise
8. A: confirm inside ten minutes → both get the same 4-digit code
9. Both confirm → item completes, both profiles show 1 completed handoff

Then deliberately break it once: claim something and let the ten minutes lapse.
The item must return to available and your profile must show 1 missed pickup.

## Step 8 — Before you let real people in

- **Back-ups.** Supabase takes daily back-ups on paid plans. On free, take your
  own before anything you care about exists:
  `supabase db dump --db-url "$DB_URL" -f backup.sql`
- **Free tier pauses after 7 days of inactivity.** A pilot that goes quiet over
  a holiday comes back to a paused project and students seeing errors. If this
  is a real pilot rather than a demo, it belongs on a paid plan
- **You cannot run `npm run verify` against production.** It creates and deletes
  users, so it refuses any non-local database on purpose. Run it against local
  after any change to `schema.sql`, then apply the same SQL to production
- **Watch the first week.** Supabase → Logs → Auth for people who couldn't sign
  in, and Postgres logs for RLS denials. The failure you care about is silent:
  a student who never got the email and simply left

---

## Applying schema changes later

There is no migration tool wired up. `supabase/schema.sql` is written to be
re-runnable — `create table if not exists`, `create or replace function`,
`drop policy if exists` before each create — so the routine is:

1. Edit `supabase/schema.sql`
2. `npm run db:reset` locally, then `npm run verify` — 41 checks
3. Paste the changed statements into the production SQL editor
4. `npm run db:types` and commit, if you changed a table

Adding a column, function or policy is fine this way. Renaming or dropping a
column is not — write that as a one-off `alter table` and run it deliberately,
because `if not exists` will not do it for you.

## If pg_cron is unavailable

Everything still works; cleanup just runs less often. Reservations are still
correct, because `claim_item` heals a lapsed hold itself. To sweep more often
than Vercel's daily cron, point any external scheduler at:

```
GET https://your-app.vercel.app/api/maintenance
Authorization: Bearer <MAINTENANCE_SECRET>
```

Every few minutes is plenty.

## A note on honesty

`docs/spec.md` §10 and CLAUDE.md rule 1 both say the same thing, and deployment
is where it gets tested: report the real numbers from your pilot however small
they are. Two completed handoffs that actually happened is a stronger claim
than any figure you could put on a slide, because it is checkable.
