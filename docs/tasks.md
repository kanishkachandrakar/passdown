# Build Plan — Aug 14 to Aug 20

Tick these off. If something is slipping, cut from the bottom of the day, never from the core loop.

## Aug 14 — foundation

- [ ] `npx create-next-app@latest passdown --typescript --tailwind --app --src-dir --eslint`
- [ ] Drop in `CLAUDE.md`, `docs/`, `supabase/`, `src/lib/matching.ts`
- [ ] `npm i @supabase/supabase-js @supabase/ssr`
- [ ] Create Supabase project, run `supabase/schema.sql`
- [ ] `.env.local` with URL + anon key; confirm `.env.local` is gitignored
- [ ] `src/lib/supabase/client.ts` and `server.ts`
- [ ] Email OTP sign-in (any institutional domain, not `.edu`-only)
- [ ] Profile row auto-created on signup — verify the trigger fires
- [ ] Push to GitHub, deploy to Vercel, add env vars there too
- [ ] Landing page

## Aug 15 — the two forms

- [ ] Create Need form + write to `needs`
- [ ] Release Item form + write to `items`
- [ ] Photo upload to the `item-photos` bucket
- [ ] Home screen shell: two big action buttons, Your Needs list
- [ ] Empty states for both lists

## Aug 16 — matching

- [ ] Server action: on item insert, run `matchItemToNeeds`, insert `matches`
- [ ] "N students already need this" straight after release
- [ ] Match screen with the reasons list
- [ ] Match count badge on each need
- [ ] "Students near you need" section from `demo_demand`, labelled **Demo Campus Preview**

## Aug 17 — claim and handoff

- [ ] Claim button → `claim_item` RPC
- [ ] 10-minute countdown UI
- [ ] Confirm → `confirm_claim` RPC → handoff with 4-digit code
- [ ] Expiry sweep via `expire_reservations` on load
- [ ] Handoff screen, both-sides confirm → `confirm_handoff`
- [ ] **Test two browsers claiming the same item at once.** Exactly one wins.

## Aug 18 — polish + pilot

- [ ] Distance / campus area on every item and match card
- [ ] Status chips, loading states, error toasts
- [ ] Mobile pass at 390px
- [ ] Profile screen
- [ ] Run a real pilot — get actual students to complete real handoffs
- [ ] Write down the true numbers, however small

## Aug 19 — submission assets

- [ ] 2-minute demo video. Script below.
- [ ] 500-word write-up
- [ ] Tool list (Claude Code, Next.js, Supabase, Vercel, everything)
- [ ] README with two demo accounts a judge can log into

## Aug 20 — submit

- [ ] Final deploy, click through the whole loop on the live URL
- [ ] Submit

---

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
