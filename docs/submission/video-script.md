# 2-minute demo video — shot list

Everything below is filmable in one sitting. Nothing needs to be built first.

## Setup (10 minutes before you record)

```bash
npm run db:start                                   # Postgres, auth, storage
npm run dev                                        # note the port it prints
node --env-file=.env.local scripts/screenshot-setup.mjs > shots.json
```

`screenshot-setup.mjs` builds a campus mid-loop — two students in different
blocks, three items, a need with matches, one live hold, one arranged handoff —
and prints the session cookies and the paths worth capturing. `--clean` removes
it afterwards.

Two browser windows, side by side, **both 390px wide** (Responsive mode). Left
window signed in as Ana (Block A, needs a fridge). Right window as Bo (Block B,
has one). Sign-in codes land in Mailpit at http://127.0.0.1:54324 — no real
inbox involved, and say that on camera so nobody wonders.

Record at 390px. This is a mobile-first app and it should look like one.

## The two hundred and twenty seconds you have

| Time | On screen | What you say |
|---|---|---|
| 0:00–0:15 | Photo of a move-out dumpster with a mini fridge in it. Then a phone showing a new fridge in a cart, $89. | "Every May we throw this out. Every August we buy it again. The two students are four hundred metres apart." |
| 0:15–0:30 | Facebook Marketplace, city-wide results. Then a group chat scrolling past. | "Marketplace is city-wide and full of strangers. The group chat is closer but it has no state — the same fridge gets promised to four people." |
| 0:30–0:50 | Ana's window: Home → *I Need Something* → mini fridge, free or under $40, by Aug 28 → submit. | "Passdown has two actions. Tell it what you need — that took ten seconds — and it waits." |
| 0:50–1:15 | Bo's window: *I'm Done With Something* → fridge, Block B, photo, free → submit. Land on the post-release screen. | "Or release what you're done with. Sixty seconds. And straight away —" **(hold on the count)** "— *seven students already need this.*" |
| 1:15–1:35 | Ana's window: the need now shows a match. Open it — reasons list and walk time visible. | "Ana gets a match, and it says why: exact item, price fits, four-minute walk from Block B, available before she needs it. Matches sort by how far you walk." |
| 1:35–1:50 | **Both windows visible.** Open the same item in each. Click Claim in Ana's. Do not touch Bo's. | "Now the part the group chat can't do. I claim it on the left — and watch the right." **(wait for the flip)** "Unavailable. Nobody touched that window. That lock is a row lock in Postgres, not a spinner in React." |
| 1:50–2:00 | Handoff screen in both: pickup point, same 4-digit code. Both confirm. Profile shows 1 completed handoff. | "Pickup point, one four-digit code, both sides confirm. Done — and the only number on my profile is the handoff that actually happened." |

## Notes that make it land

- **1:35 is the shot.** Give it the full fifteen seconds and don't narrate over
  the flip. `LiveRefresh` polls every three seconds, so the second window turns
  by itself — never touch it, and the audience will notice you didn't.
- Say both proof points out loud, in these words: **campus-close** and
  **claimed exactly once**. They are what the write-up is arguing.
- Don't claim users. If a real pilot happened, give the true figure however
  small; if it didn't, say nothing at all.
- If you have ten spare seconds, end on `npm run verify` racing twelve claims —
  it answers "is the lock real or a UI trick?" before a judge asks it.

Upload to YouTube (unlisted is fine), Vimeo, or Loom.
