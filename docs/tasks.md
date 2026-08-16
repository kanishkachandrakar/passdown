# Build Plan — Aug 14 to Aug 20

Tick these off. If something is slipping, cut from the bottom of the day, never from the core loop.

## Aug 14 — foundation

- [x] `npx create-next-app@latest passdown --typescript --tailwind --app --src-dir --eslint`
- [x] Drop in `CLAUDE.md`, `docs/`, `supabase/`, `src/lib/matching.ts`
- [x] `npm i @supabase/supabase-js @supabase/ssr`
- [x] Create Supabase project, run `supabase/schema.sql` — *running locally via `npm run db:start`; a hosted project still needs creating before deploy*
- [x] `.env.local` with URL + anon key; confirm `.env.local` is gitignored
- [x] `src/lib/supabase/client.ts` and `server.ts` (plus `admin.ts` for matching)
- [x] Email OTP sign-in (any institutional domain, not `.edu`-only)
- [x] Profile row auto-created on signup — trigger verified by `npm run verify`
- [ ] Push to GitHub, deploy to Vercel, add env vars there too
- [x] Landing page

## Aug 15 — the two forms

- [x] Create Need form + write to `needs`
- [x] Release Item form + write to `items`
- [x] Photo upload to the `item-photos` bucket
- [x] Home screen shell: two big action buttons, Your Needs list
- [x] Empty states for both lists

## Aug 16 — matching

- [x] Server action: on item insert, run `matchItemToNeeds`, insert `matches`
- [x] "N students already need this" straight after release
- [x] Match screen with the reasons list
- [x] Match count badge on each need
- [x] "Students near you need" section from `demo_demand`, labelled **Demo Campus Preview**

## Aug 17 — claim and handoff

- [x] Claim button → `claim_item` RPC
- [x] 10-minute countdown UI
- [x] Confirm → `confirm_claim` RPC → handoff with 4-digit code
- [x] Expiry sweep — `pg_cron` every minute, `/api/maintenance`, on-load, and self-healing inside `claim_item`
- [x] Handoff screen, both-sides confirm → `confirm_handoff`
- [x] **Test two browsers claiming the same item at once.** Exactly one wins.
      → `npm run verify`: 10 rounds × 12 simultaneous claims, one winner every round

## Aug 18 — polish + pilot

- [x] Distance / campus area on every item and match card
- [x] Status chips, loading states, error toasts
- [x] Mobile pass at 390px
- [x] Profile screen
- [ ] Run a real pilot — get actual students to complete real handoffs
- [ ] Write down the true numbers, however small

## Aug 19 — submission assets

- [ ] 2-minute demo video. Script below.
- [ ] 500-word write-up
- [ ] Tool list (Claude Code, Next.js, Supabase, Vercel, everything)
- [x] README with two demo accounts a judge can log into

## Aug 20 — submit

- [ ] Final deploy, click through the whole loop on the live URL
- [ ] Submit

---

## Left to do

Nothing is blocked on code. What remains is deployment and the submission assets:

1. **Deploy** — create a hosted Supabase project, run `supabase/schema.sql`, push to GitHub, import to Vercel, set the three env vars (plus `MAINTENANCE_SECRET`). Then click the whole loop through on the live URL.
2. **Pilot** — two real students, one real handoff. Whatever the number is, report it.
3. **Video and write-up** — script below.

## Demo video script (2 min)

| Time | Beat |
|------|------|
| 0:00–0:15 | The problem — dumpster at move-out, someone buying the same thing in August |
| 0:15–0:30 | Why Marketplace and the group chat don't solve it: too far, too many strangers, no state |
| 0:30–0:50 | Student A posts a Need. Ten seconds. |
| 0:50–1:15 | Student B releases the fridge → *"7 students already need this"* |
| 1:15–1:35 | Student A gets Match Found with reasons and distance. Claims it. |
| 1:35–1:50 | **Split screen: the item goes unavailable in the other tab.** This is the money shot. |
| 1:50–2:00 | Handoff code, both confirm, done. Real pilot numbers if you have them. |

Say the two proof points out loud: *campus-close* and *claimed exactly once*.

The second tab flips on its own — `LiveRefresh` polls every three seconds, so
nobody has to touch refresh mid-shot. Set both windows to 390px wide.

If a judge asks whether the lock is real rather than a UI trick, run
`npm run verify` on camera. It races twelve claims at the database, ten times.
