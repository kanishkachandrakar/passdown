# Passdown — 500-word write-up

**Title:** Passdown — your campus already has one
**Category:** 02 — Overcoming Obstacles

---

Every May, a dumpster outside a residence hall fills with mini fridges, desk
lamps and storage bins that still work. Every August, students buy those
same things new. The two students are a few hundred metres apart and
never meet. I watched it happen on my own campus and it is the kind of problem
that shouldn't exist in 2026.

Two things already try to solve this, and both fail in a specific way.
Facebook Marketplace is city-wide and full of strangers — you end up hauling a
fridge across town to meet someone you can't verify. The campus
free-and-for-sale group chat is closer, but it has no state: the same fridge
gets promised to four people, three of them get ghosted, and everyone
learns not to trust it.

Passdown is a campus-scoped exchange for verified students, built around the
thing the group chat is missing — item state. There are two actions. *I need
something* posts a lightweight Need and waits. *I'm done with something* is a
sixty-second release. When a release matches an open Need, the system scores it,
creates the match and tells the student why it matched: exact item, price fits
your limit, four-minute walk from Block B, available before you need it.
Matches are sorted by walking distance, because being close is the entire point.

Then the part that makes it different from a group chat. Claiming an item takes
a ten-minute reservation lock, and that lock lives in Postgres, not in React.
`claim_item` takes a row lock, re-checks status inside the transaction, and a
unique partial index permits exactly one active reservation per item. Claim in
one tab and the item flips to unavailable in every other student's tab within
three seconds. I race twelve simultaneous claims at the database ten times over
in `npm run verify` — exactly one winner every round, and every loser is told
that the item is gone. Sixty-seven database checks and sixty-five
rendered-screen checks run as suites, not as claims in a README.

It's for any student at a residential campus, and built to be honest with
them. Trust is three facts — verified student, completed handoffs, missed
pickups. No star ratings, no bids, no negotiation, no feed. Payment stays off
the platform and the UI says so. Every sample listing is labelled; the only
counts shown are your own. There is no invented traction in this
project, because on a marketplace with eleven users a fake number is the fastest
way to lose the eleven.

It scales the way campuses do: a new institution is a new verified email domain
and a campus map, not a new deployment. Verification accepts any institutional
domain — vit.ac.in and unam.mx, not just `.edu` — because the students who most
need a way to furnish a room cheaply are often the ones an `.edu` check quietly
excludes.

The move-out dumpster is the most visible waste on any campus. The thing
standing between it and the student who needs a fridge was never supply. It was
state.
