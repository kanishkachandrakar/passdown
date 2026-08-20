/**
 * End-to-end verification of the Passdown core loop, against a real Postgres.
 *
 *   npm run verify
 *
 * This is not a unit test of a mock. It creates real users through the auth
 * API, writes through PostgREST under RLS with each student's own JWT, and
 * calls the same RPCs the app calls. If this passes, the loop in CLAUDE.md
 * works — including the part that is easy to claim and hard to prove:
 *
 *   two students clicking Claim at the same instant produce ONE reservation.
 *
 * Run it against the local stack (`npx supabase start`). Do not point it at a
 * database with real users in it — it creates and deletes its own accounts.
 */

import { createClient } from "@supabase/supabase-js";

import { matchItemToNeeds } from "../src/lib/matching.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(
    `Refusing to run against ${URL}. This script creates and deletes users;\n` +
      "point it at the local stack only."
  );
  process.exit(1);
}

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ------------------------------------------------------------------ harness */

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  [32m✓[0m ${label}`);
  } else {
    failures.push(label);
    console.log(`  [31m✗[0m ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function step(title) {
  console.log(`\n[1m${title}[0m`);
}

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* -------------------------------------------------------------- fixtures */

const DOMAIN = "vit.ac.in"; // deliberately not .edu
const PASSWORD = "passdown-verify-9271";

const PEOPLE = {
  ana: { email: `verify.ana@${DOMAIN}`, name: "Ana", area: "block-a" },
  bo: { email: `verify.bo@${DOMAIN}`, name: "Bo", area: "block-b" },
  cy: { email: `verify.cy@${DOMAIN}`, name: "Cy", area: "block-c" },
};

/**
 * Tear down anything these accounts left behind, then the accounts.
 *
 * Order matters. `handoffs.giver_id` and `receiver_id` reference profiles with
 * no cascade — on purpose, so a completed handoff can't be erased out from
 * under the other student — which means a profile with handoff history cannot
 * be deleted until that history is. The app never deletes accounts; this
 * script does, so it does the work.
 */
async function removeExistingTestUsers() {
  const emails = new Set(Object.values(PEOPLE).map((p) => p.email));

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const targets = (data?.users ?? []).filter((u) => emails.has(u.email));
  if (!targets.length) return;

  const ids = targets.map((u) => u.id);

  const { data: ownedItems } = await admin
    .from("items")
    .select("id")
    .in("owner_id", ids);
  const itemIds = (ownedItems ?? []).map((i) => i.id);

  await admin.from("handoffs").delete().in("giver_id", ids);
  await admin.from("handoffs").delete().in("receiver_id", ids);
  if (itemIds.length) await admin.from("handoffs").delete().in("item_id", itemIds);
  await admin.from("reservations").delete().in("claimant_id", ids);
  await admin.from("needs").delete().in("user_id", ids);
  await admin.from("items").delete().in("owner_id", ids);

  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`cleanup deleteUser ${id}: ${error.message}`);
  }
}

async function createStudent({ email, name, area }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);

  await admin.from("profiles").update({ campus_area: area }).eq("id", data.user.id);

  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn ${email}: ${signInError.message}`);

  return { id: data.user.id, client, name };
}

/**
 * Mirrors the matching half of the releaseItem server action: score the new
 * item against every open need on campus under the service role, write the
 * match rows. Same `matchItemToNeeds` the app imports — not a copy of it.
 */
async function runMatching(itemId) {
  const { data: item } = await admin.from("items").select("*").eq("id", itemId).single();

  const { data: needRows } = await admin
    .from("needs")
    .select("*, profiles!inner(campus_area, institution)")
    .eq("status", "open")
    .neq("user_id", item.owner_id);

  const needs = (needRows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    item_name: row.item_name,
    category: row.category,
    free_only: row.free_only,
    max_price: row.max_price,
    needed_by: row.needed_by,
    preferred_condition: row.preferred_condition,
    campus_area: row.profiles?.campus_area ?? null,
  }));

  const results = matchItemToNeeds(
    { ...item, price: Number(item.price) },
    needs,
    // Block B lobby sits in Block B; the app derives this from the campus map.
    "block-b"
  );

  if (results.length) {
    await admin.from("matches").upsert(
      results.map((m) => ({
        item_id: m.item_id,
        need_id: m.need_id,
        match_score: m.match_score,
        reasons: m.reasons,
      })),
      { onConflict: "item_id,need_id" }
    );
  }

  return results;
}

/* ------------------------------------------------------------------- run */

async function main() {
  console.log("Passdown — verifying the core loop against real Postgres\n");

  step("Setup: three verified students");
  await removeExistingTestUsers();
  const ana = await createStudent(PEOPLE.ana);
  const bo = await createStudent(PEOPLE.bo);
  const cy = await createStudent(PEOPLE.cy);

  const { data: anaProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", ana.id)
    .single();

  check("signup trigger created a profile row", Boolean(anaProfile));
  check(
    "institution taken from the email domain, and it isn't .edu",
    anaProfile?.institution === DOMAIN,
    anaProfile?.institution
  );
  check("student is marked verified", anaProfile?.verified === true);

  /* ---------------------------------------------------------- 1. the need */

  step("1. Ana posts a need");
  const { data: anaNeed, error: needError } = await ana.client
    .from("needs")
    .insert({
      user_id: ana.id,
      item_name: "Mini fridge",
      category: "Dorm",
      free_only: true,
      needed_by: dayOffset(14),
    })
    .select()
    .single();

  check("need written under RLS", Boolean(anaNeed), needError?.message);

  // Cy wants the same thing — this is who Ana races later.
  const { data: cyNeed } = await cy.client
    .from("needs")
    .insert({
      user_id: cy.id,
      item_name: "Mini fridge",
      category: "Dorm",
      free_only: true,
      needed_by: dayOffset(14),
    })
    .select()
    .single();

  const { data: anaSeesNeeds } = await ana.client.from("needs").select("*");
  check(
    "one student cannot read another's needs",
    anaSeesNeeds?.length === 1 && anaSeesNeeds[0].id === anaNeed.id,
    `saw ${anaSeesNeeds?.length} rows`
  );

  /* ------------------------------------------------------- 2. the release */

  step("2. Bo releases a matching fridge");
  const { data: fridge, error: itemError } = await bo.client
    .from("items")
    .insert({
      owner_id: bo.id,
      name: "Mini fridge",
      category: "Dorm",
      condition: "good",
      is_free: true,
      price: 0,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(21),
    })
    .select()
    .single();

  check("item written under RLS", Boolean(fridge), itemError?.message);

  /* -------------------------------------------------------- 3. the match */

  step("3. Matching runs");
  const results = await runMatching(fridge.id);

  // Asserted by identity, not by count: other students' open needs may exist
  // on this campus and legitimately match too.
  const matchedNeedIds = new Set(results.map((r) => r.need_id));
  check(
    "both of these students' open needs matched",
    matchedNeedIds.has(anaNeed.id) && matchedNeedIds.has(cyNeed.id),
    `matched ${results.length} needs`
  );
  check(
    "score clears the threshold",
    results.every((r) => r.match_score >= 40),
    results.map((r) => r.match_score).join(", ")
  );
  check(
    "match explains itself",
    results[0].reasons.includes("Exactly what you asked for") &&
      results[0].reasons.includes("Free"),
    JSON.stringify(results[0].reasons)
  );

  const { data: anaMatches } = await ana.client
    .from("matches")
    .select("*, items(*)")
    .eq("need_id", anaNeed.id);

  check("Ana can see her match", anaMatches?.length === 1);
  check(
    "the match carries the item with it",
    anaMatches?.[0]?.items?.name === "Mini fridge"
  );

  step("3b. Matching says no when it should");

  const lampAgainstFridgeNeed = matchItemToNeeds(
    {
      id: "x",
      owner_id: bo.id,
      name: "Desk lamp",
      category: "Dorm",
      condition: "like_new",
      is_free: true,
      price: 0,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(21),
    },
    [
      {
        id: anaNeed.id,
        user_id: ana.id,
        item_name: "Mini fridge",
        category: "Dorm",
        free_only: true,
        max_price: null,
        needed_by: dayOffset(14),
        preferred_condition: null,
        campus_area: "block-a",
      },
    ],
    "block-b"
  );
  check(
    "a free desk lamp does not 'match' a request for a mini fridge",
    lampAgainstFridgeNeed.length === 0,
    `scored ${lampAgainstFridgeNeed[0]?.match_score}`
  );

  const bedsideLamp = matchItemToNeeds(
    {
      id: "y",
      owner_id: bo.id,
      name: "Bedside lamp",
      category: "Dorm",
      condition: "good",
      is_free: true,
      price: 0,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(21),
    },
    [
      {
        id: "n2",
        user_id: ana.id,
        item_name: "Desk lamp",
        category: "Dorm",
        free_only: true,
        max_price: null,
        needed_by: dayOffset(14),
        preferred_condition: null,
        campus_area: "block-a",
      },
    ],
    "block-b"
  );
  check(
    "but a bedside lamp still matches a need for a desk lamp",
    bedsideLamp.length === 1,
    `${bedsideLamp.length} matches`
  );

  const pricedTooHigh = matchItemToNeeds(
    {
      id: "z",
      owner_id: bo.id,
      name: "Mini fridge",
      category: "Dorm",
      condition: "good",
      is_free: false,
      price: 120,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(21),
    },
    [
      {
        id: "n3",
        user_id: ana.id,
        item_name: "Mini fridge",
        category: "Dorm",
        free_only: false,
        max_price: 40,
        needed_by: dayOffset(14),
        preferred_condition: null,
        campus_area: "block-a",
      },
    ],
    "block-b"
  );
  check("an item over the price limit is filtered out", pricedTooHigh.length === 0);

  /* --------------------------------------------- 4. THE CONCURRENCY TEST */

  step("4. Ana and Cy claim the same fridge at the same instant");

  const [anaClaim, cyClaim] = await Promise.all([
    ana.client.rpc("claim_item", { p_item_id: fridge.id }),
    cy.client.rpc("claim_item", { p_item_id: fridge.id }),
  ]);

  const winners = [anaClaim, cyClaim].filter((r) => !r.error);
  const losers = [anaClaim, cyClaim].filter((r) => r.error);

  check("exactly one claim succeeded", winners.length === 1, `${winners.length} succeeded`);
  check("exactly one claim was rejected", losers.length === 1);
  check(
    "the loser is told the item is gone, not given a stack trace",
    losers[0]?.error?.message?.includes("item_unavailable"),
    losers[0]?.error?.message
  );

  const { data: activeReservations } = await admin
    .from("reservations")
    .select("*")
    .eq("item_id", fridge.id)
    .eq("status", "active");

  check(
    "the database holds exactly one active reservation",
    activeReservations?.length === 1,
    `${activeReservations?.length} rows`
  );

  const { data: lockedItem } = await admin
    .from("items")
    .select("status")
    .eq("id", fridge.id)
    .single();

  check("the item is now reserved, not available", lockedItem.status === "reserved");

  const winner = winners[0].data;
  const reservation = Array.isArray(winner) ? winner[0] : winner;
  const winnerIsAna = reservation.claimant_id === ana.id;
  const holder = winnerIsAna ? ana : cy;
  const other = winnerIsAna ? cy : ana;

  console.log(`  [2m→ ${holder.name} got it; ${other.name} did not[0m`);

  const heldMinutes =
    (new Date(reservation.expires_at).getTime() - new Date(reservation.created_at).getTime()) /
    60000;
  check("hold is ten minutes", Math.round(heldMinutes) === 10, `${heldMinutes} min`);

  // The loser's screen: the item must read as unavailable to them.
  const { data: otherView } = await other.client
    .from("items")
    .select("status")
    .eq("id", fridge.id)
    .single();
  check(
    "the other tab sees it as unavailable",
    otherView.status !== "available",
    otherView.status
  );

  /* --------------------------------------- 4b. the same race, under load */

  step("4b. The same race, ten times over, twelve claims at once");

  let racesRun = 0;
  let alwaysExactlyOne = true;
  let losersAlwaysTold = true;

  for (let round = 0; round < 10; round += 1) {
    // Put the fridge back on the board and clear the hold, by hand.
    await admin
      .from("reservations")
      .delete()
      .eq("item_id", fridge.id);
    await admin.from("items").update({ status: "available" }).eq("id", fridge.id);

    // Twelve simultaneous claims, alternating between two students.
    const attempts = Array.from({ length: 12 }, (_, i) =>
      (i % 2 === 0 ? ana : cy).client.rpc("claim_item", { p_item_id: fridge.id })
    );
    const settled = await Promise.all(attempts);

    const ok = settled.filter((r) => !r.error);
    const rejected = settled.filter((r) => r.error);

    const { data: live } = await admin
      .from("reservations")
      .select("id")
      .eq("item_id", fridge.id)
      .eq("status", "active");

    if (ok.length !== 1 || live?.length !== 1) alwaysExactlyOne = false;
    if (!rejected.every((r) => /item_unavailable|one_active_reservation/.test(r.error.message))) {
      losersAlwaysTold = false;
    }
    racesRun += 1;
  }

  check(
    `${racesRun} rounds × 12 simultaneous claims — exactly one winner every time`,
    alwaysExactlyOne
  );
  check("every loser got a clean 'already claimed', never a crash", losersAlwaysTold);

  // Leave the fridge held by one student so the rest of the loop can run.
  await admin.from("reservations").delete().eq("item_id", fridge.id);
  await admin.from("items").update({ status: "available" }).eq("id", fridge.id);
  const { data: reclaim } = await holder.client.rpc("claim_item", {
    p_item_id: fridge.id,
  });
  const finalReservation = Array.isArray(reclaim) ? reclaim[0] : reclaim;

  /* -------------------------------------------------------- 5. confirm */

  step("5. The holder confirms inside the window");
  const { data: handoffData, error: confirmError } = await holder.client.rpc(
    "confirm_claim",
    { p_reservation_id: finalReservation.id }
  );

  const handoff = Array.isArray(handoffData) ? handoffData[0] : handoffData;
  check("claim confirmed", Boolean(handoff), confirmError?.message);
  check(
    "handoff has a 4-digit code",
    /^\d{4}$/.test(handoff?.confirmation_code ?? ""),
    handoff?.confirmation_code
  );
  check("giver is the releaser", handoff?.giver_id === bo.id);
  check("receiver is the claimant", handoff?.receiver_id === holder.id);

  const { data: claimedItem } = await admin
    .from("items")
    .select("status")
    .eq("id", fridge.id)
    .single();
  check("item moved to claimed", claimedItem.status === "claimed");

  /* -------------------------------------------------------- 6. handoff */

  step("6. Both sides confirm at pickup");
  await bo.client.rpc("confirm_handoff", { p_handoff_id: handoff.id });

  const { data: halfway } = await admin
    .from("handoffs")
    .select("status")
    .eq("id", handoff.id)
    .single();
  check("one confirmation is not enough", halfway.status === "scheduled");

  await holder.client.rpc("confirm_handoff", { p_handoff_id: handoff.id });

  const { data: finished } = await admin
    .from("handoffs")
    .select("status")
    .eq("id", handoff.id)
    .single();
  check("both confirmations complete the handoff", finished.status === "completed");

  const { data: doneItem } = await admin
    .from("items")
    .select("status")
    .eq("id", fridge.id)
    .single();
  check("item is completed", doneItem.status === "completed");

  const { data: boProfile } = await admin
    .from("profiles")
    .select("successful_handoffs")
    .eq("id", bo.id)
    .single();
  check("giver's completed count went up", boProfile.successful_handoffs === 1);

  const { data: holderNeed } = await admin
    .from("needs")
    .select("status")
    .eq("user_id", holder.id)
    .single();
  check("the need it satisfied is now fulfilled", holderNeed.status === "fulfilled");

  /* --------------------------------------------- 7. expiry and self-heal */

  step("7. A hold that lapses returns the item without a sweep");
  const { data: lamp } = await bo.client
    .from("items")
    .insert({
      owner_id: bo.id,
      name: "Desk lamp",
      category: "Dorm",
      condition: "like_new",
      is_free: true,
      price: 0,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(21),
    })
    .select()
    .single();

  await other.client.rpc("claim_item", { p_item_id: lamp.id });

  // Wind their ten minutes back into the past, and run nothing.
  await admin
    .from("reservations")
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("item_id", lamp.id)
    .eq("status", "active");

  const { data: healed, error: healError } = await holder.client.rpc("claim_item", {
    p_item_id: lamp.id,
  });
  const healedReservation = Array.isArray(healed) ? healed[0] : healed;

  check(
    "the next student can claim it even though no sweep has run",
    Boolean(healedReservation),
    healError?.message
  );
  check(
    "the lapsed hold is marked expired, not left active",
    (
      await admin
        .from("reservations")
        .select("id")
        .eq("item_id", lamp.id)
        .eq("status", "active")
    ).data?.length === 1
  );

  const { data: missedProfile } = await admin
    .from("profiles")
    .select("missed_pickups")
    .eq("id", other.id)
    .single();
  check(
    "letting a hold lapse counts as a missed pickup",
    missedProfile.missed_pickups === 1,
    `${missedProfile.missed_pickups}`
  );

  step("8. A confirmed claim cannot be resurrected after expiry");
  await admin
    .from("reservations")
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", healedReservation.id);

  const { error: lateError } = await holder.client.rpc("confirm_claim", {
    p_reservation_id: healedReservation.id,
  });
  check(
    "confirming a lapsed reservation is refused by Postgres",
    lateError?.message?.includes("reservation_expired"),
    lateError?.message
  );

  /* ------------------------------------------- 9. long-run housekeeping */

  step("9. Housekeeping keeps the board honest over months");

  const { data: staleItem } = await admin
    .from("items")
    .insert({
      owner_id: bo.id,
      name: "Old kettle",
      category: "Kitchen",
      condition: "fair",
      is_free: true,
      price: 0,
      pickup_location: "block-b-lobby",
      available_until: dayOffset(-3),
      status: "available",
    })
    .select()
    .single();

  const { data: staleNeed } = await admin
    .from("needs")
    .insert({
      user_id: ana.id,
      item_name: "Ancient need",
      category: "Other",
      free_only: true,
      needed_by: dayOffset(-5),
      status: "open",
    })
    .select()
    .single();

  await admin.rpc("run_maintenance");

  const { data: sweptItem } = await admin
    .from("items")
    .select("status")
    .eq("id", staleItem.id)
    .single();
  check("an item past its available-until is expired", sweptItem.status === "expired");

  const { data: sweptNeed } = await admin
    .from("needs")
    .select("status")
    .eq("id", staleNeed.id)
    .single();
  check("a need past its needed-by is expired", sweptNeed.status === "expired");

  const { data: cronJobs } = await admin.rpc("run_maintenance");
  check("maintenance is safely repeatable", cronJobs !== null);

  step("10. A lapsed item cannot be claimed");
  const { error: expiredClaimError } = await holder.client.rpc("claim_item", {
    p_item_id: staleItem.id,
  });
  check(
    "claiming a lapsed item is refused",
    Boolean(expiredClaimError),
    expiredClaimError?.message
  );

  /* ------------------------------------------------------------ cleanup */

  await removeExistingTestUsers();

  /* ------------------------------------------------------------ summary */

  console.log(`\n${"─".repeat(56)}`);
  if (failures.length === 0) {
    console.log(`[32m${passed} checks passed.[0m The core loop holds.`);
  } else {
    console.log(
      `[31m${failures.length} failed[0m, ${passed} passed:\n` +
        failures.map((f) => `  · ${f}`).join("\n")
    );
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error("\nVerification crashed:", error);
  await removeExistingTestUsers().catch(() => {});
  process.exit(1);
});
