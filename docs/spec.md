# Passdown — Product Spec

## 1. Problem

Students throw away usable things at move-out while other students buy those same things at move-in. The item is often a few hundred metres away from the person who needs it.

Facebook Marketplace exists, but it is city-wide, full of strangers, and requires hauling a fridge across town. Campus group chats exist, but they have no search and no state — the same item gets promised to four people and three of them are ghosted.

## 2. What Passdown is

A campus-scoped, verified-student exchange with real item state. Two actions:

- **I Need Something** → a lightweight Need that waits for supply
- **I'm Done With Something** → a 60-second release

When a release matches an open Need, the system notifies the student automatically. They claim it, the item locks, and both sides get a handoff code.

## 3. Users

Students at a single institution, verified by institutional email. No cross-campus browsing in v1 — the whole value is that everything is close.

## 4. Core loop

| Step | Actor | Result |
|------|-------|--------|
| 1 | Student A | Creates Need: *mini fridge, by Aug 28, free or under $40* |
| 2 | Student B | Releases mini fridge, sets pickup + available-until |
| 3 | System | Scores item against open Needs, creates Match rows, notifies A |
| 4 | Student A | Taps Claim → `reservations` row, 10 min expiry, item → `reserved` |
| 5 | Student A | Confirms → item → `claimed`, handoff created with 4-digit code |
| 6 | Both | Confirm at pickup → item → `completed`, counters increment |

If A does not confirm within 10 minutes, the reservation expires and the item returns to `available`.

## 5. Screens

### 5.1 Landing
Name, tagline, one supporting line, single CTA: **Enter Passdown**.

### 5.2 Verify
Institutional email → 6-digit code (Supabase OTP). Accept any institutional domain, not just `.edu`. Store the domain as `institution`.

### 5.3 Home
- Header: Passdown / *Your campus already has one.*
- **What are you doing?** — two large buttons: *I Need Something*, *I'm Done With Something*
- **Your Needs** — each with live match count ("3 possible matches" / "Waiting for match")
- **Students near you need** — top demanded items with counts (labelled **Demo Campus Preview** when seeded)
- **Recent matches** — a few, not a feed

Browsing exists but is secondary. No endless grid.

### 5.4 Create Need
Four fields: item name, category, free-only toggle or max price, needed-by date. Optional: preferred condition. Submit in under 20 seconds.

### 5.5 Release Item
Item name, category, condition, photo, free/price, available-until, pickup location. Optional short description.

**Immediately after submit**, show: *"7 students already need this."* This is the hook that makes releasing feel worth it.

### 5.6 Match
Show *why* it matched:
- exact item match
- price fits your limit
- 4 min walk — Block B
- available before you need it

### 5.7 Claim
Claim button → countdown timer → Confirm. On expiry, clear messaging: *Reservation expired. The item is available again.*

### 5.8 Handoff
Pickup location, time window, 4-digit confirmation code, two confirm buttons.

### 5.9 Profile
Name, institution, Verified Student ✓, completed handoffs, missed pickups, your open needs and active items. No bios, no followers.

### 5.10 Another student's page — `/students/[id]`
The same trust record for someone else, plus everything else they currently
have on the board. Campus-scoped like everything: a student at another
institution does not exist to you. No bios, no follows, no ratings.

### 5.11 Messages
One thread per pair of students, usually attached to one item. Inbox with last
line and unread count; thread with a composer. Blocking is mutual in effect and
undoable, and is not announced to the other person.

Added after v1, overriding §11's original exclusion. Kept small on purpose: no
groups, no attachments, no presence, no read receipts beyond "you have unread
messages". Contact details are never shared — the pickup point and the 4-digit
code remain how a handover is arranged.

## 6. Matching

Plain scoring function, no ML. See `src/lib/matching.ts`.

It runs in **both directions**, which matters more than it sounds:

- a released item is scored against every open need (`matchNewItem`)
- a newly posted need is scored against everything already on the board
  (`matchNewNeed`)

Supply usually arrives before demand — the fridge is listed in June, the
student who wants it arrives in August — so the second direction is the
commoner one. The same `scoreMatch` drives both, so a given pair scores
identically whichever way round it is evaluated.

**Hard filters (must pass):**
- item not owned by the needer
- item status is `available`
- `available_until` >= `needed_by` (or `needed_by` is null)
- price fits: free item always fits; priced item fails if `free_only` or `price > max_price`
- **the name is relevant** — the item name must match the need exactly, contain
  it (or be contained by it), or share a significant word

**Score:**
| Signal | Points |
|--------|--------|
| exact item name match (normalised) | 50 |
| one name contains the other | 35 |
| names share a significant word | 25 |
| same category | 20 |
| item is free | 15 |
| condition meets preference | 10 |
| same residence block / campus area | 10 |
| available well before needed-by | 5 |

Threshold: 40. Below that, no match row.

The name filter is not redundant with the threshold. Category (20) + free (15) +
date slack (5) is exactly 40, so without it a desk lamp matches a request for a
mini fridge on the strength of being free furniture available in time. One bad
match like that costs more trust than ten missed good ones.

## 7. Item states

`available → reserved → claimed → completed`, plus `expired`.

Either side can call off an arranged pickup before both have confirmed: the
handoff goes `cancelled`, the item returns to `available`, and the receiver's
need reopens. That is deliberately *not* recorded as a missed pickup — missed
pickups are for holds left to lapse in silence, and saying "I can't make it" is
the opposite of that.

Never allow two users to believe they hold the same item. Enforced by:
- the `claim_item` Postgres function (row lock + status check in one transaction)
- a unique partial index allowing only one `active` reservation per item

## 8. Trust

Verified Student ✓ · completed handoffs · missed pickups. Nothing more. No public star ratings.

## 9. Pricing

Free or fixed price only. No bidding, offers, or negotiation. Payment happens off-platform in v1 and the UI says so plainly.

## 10. Honesty rules

- No invented traction numbers anywhere
- Seeded data carries a **Demo Campus Preview** label
- If a real pilot happens, report the real figures however small
- Don't claim institutional integrations that don't exist

## 11. Out of scope for v1

Delivery, storage, escrow, bundles, benefits/meal swipes, cross-campus, admin
tools, analytics, AI features.

Messaging was on this list and was later built (§5.11) — a deliberate change of
mind, not an oversight. What stays excluded is everything that would turn a
thread into a feed: groups, attachments, follows, ratings.

## 12. Judging alignment

| Criterion | How this scores |
|-----------|-----------------|
| Real student problem | Move-out waste is visible on every campus |
| Originality | Need-before-supply matching + enforced single-claim, not another listings grid |
| Scale potential | Institution-scoped by design; new campus = new verified domain |
| Design & experience | Mobile-first, fast release form, clear states |
| Build quality | Concurrency handled in the database, not hand-waved in the UI |

Category: **02 — Overcoming Obstacles**.
