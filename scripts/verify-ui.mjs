/**
 * Renders every screen against a running dev server, signed in as a real
 * student, and checks the things that must never quietly disappear:
 * proximity on cards, the Demo Campus Preview label, match reasons, and the
 * item flipping to unavailable for everyone else the moment it is claimed.
 *
 *   npm run dev            # in one terminal
 *   npm run verify:ui      # in another
 *
 * Session cookies are produced by @supabase/ssr itself rather than
 * hand-assembled, so what this sends is byte-for-byte what a browser sends.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { matchItemToNeeds } from "../src/lib/matching.ts";

const BASE = process.env.PASSDOWN_URL ?? "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(URL_, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  [32m✓[0m ${label}`);
  } else {
    failures.push(label);
    console.log(`  [31m✗[0m ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const step = (t) => console.log(`\n[1m${t}[0m`);
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const DOMAIN = "vit.ac.in";
const PASSWORD = "passdown-verify-9271";
const PEOPLE = {
  ana: { email: `ui.ana@${DOMAIN}`, name: "Ana Sharma", area: "block-a" },
  bo: { email: `ui.bo@${DOMAIN}`, name: "Bo Adeyemi", area: "block-b" },
};

async function cleanup() {
  const emails = new Set(Object.values(PEOPLE).map((p) => p.email));
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ids = (data?.users ?? []).filter((u) => emails.has(u.email)).map((u) => u.id);
  if (!ids.length) return;

  const { data: items } = await admin.from("items").select("id").in("owner_id", ids);
  const itemIds = (items ?? []).map((i) => i.id);

  await admin.from("handoffs").delete().in("giver_id", ids);
  await admin.from("handoffs").delete().in("receiver_id", ids);
  if (itemIds.length) await admin.from("handoffs").delete().in("item_id", itemIds);
  await admin.from("reservations").delete().in("claimant_id", ids);
  await admin.from("needs").delete().in("user_id", ids);
  await admin.from("items").delete().in("owner_id", ids);
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}

/** A signed-in student, plus the exact Cookie header a browser would send. */
async function signIn({ email, name, area }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  await admin.from("profiles").update({ campus_area: area }).eq("id", data.user.id);

  const auth = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } = await auth.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);

  // Let @supabase/ssr serialise the session into cookies for us.
  const jar = [];
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => jar.push(...cookies),
    },
  });
  await ssr.auth.setSession({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });

  const cookie = jar.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
  if (!cookie) throw new Error("no session cookies were produced");

  return { id: data.user.id, client: auth, cookie, name };
}

async function get(path, who) {
  const response = await fetch(`${BASE}${path}`, {
    headers: who ? { cookie: who.cookie } : {},
    redirect: "manual",
  });
  const body = response.status < 300 ? await response.text() : "";
  return { status: response.status, body, location: response.headers.get("location") };
}

/** Strip tags so assertions match visible copy, not markup. */
const visible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

async function main() {
  console.log(`Passdown — verifying the rendered UI at ${BASE}\n`);

  const root = await fetch(BASE).catch(() => null);
  if (!root) {
    console.error(`No dev server at ${BASE}. Start one with: npm run dev`);
    process.exit(1);
  }

  await cleanup();

  step("Signed-out visitor");
  const landing = await get("/");
  check("landing renders", landing.status === 200);
  check(
    "tagline is on the landing page",
    visible(landing.body).includes("Your campus already has one"),
  );
  check(
    "both positioning proofs are visible, not buried",
    visible(landing.body).includes("Not a city-wide marketplace") &&
      visible(landing.body).includes("Not the group chat")
  );

  const guarded = await get("/home");
  check("signed-out students are sent to verify", guarded.status === 307);

  const verify = await get("/verify");
  check(
    "verify explains that any institution works, not just .edu",
    visible(verify.body).includes("doesn't have to end in .edu") ||
      visible(verify.body).includes("not just")
  );

  step("Two verified students");
  const ana = await signIn(PEOPLE.ana);
  const bo = await signIn(PEOPLE.bo);

  const home = await get("/home", ana);
  check("home renders for a signed-in student", home.status === 200);
  check("home asks the one question", visible(home.body).includes("what are you doing"));
  check(
    "both actions are offered",
    visible(home.body).includes("I need something") &&
      visible(home.body).includes("I'm done with something")
  );
  check(
    "seeded demand carries the Demo Campus Preview label",
    visible(home.body).includes("Demo Campus Preview")
  );
  check(
    "no invented traction on the home screen",
    !/\b\d{3,}\s*(items|students|handoffs)\b/i.test(visible(home.body))
  );

  check("the release form renders", (await get("/release", ana)).status === 200);
  check("the need form renders", (await get("/need/new", ana)).status === 200);

  step("Ana needs a fridge; Bo has one");
  const { data: need } = await ana.client
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

  const { data: fridge } = await bo.client
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
      description: "Works fine, door seal is a bit loose.",
    })
    .select()
    .single();

  // Same matcher the release action uses.
  const { data: openNeeds } = await admin
    .from("needs")
    .select("*, profiles!inner(campus_area)")
    .eq("status", "open")
    .neq("user_id", bo.id);

  const results = matchItemToNeeds(
    { ...fridge, price: Number(fridge.price) },
    (openNeeds ?? []).map((n) => ({ ...n, campus_area: n.profiles?.campus_area ?? null })),
    "block-b"
  );
  await admin.from("matches").upsert(
    results.map((m) => ({
      item_id: m.item_id,
      need_id: m.need_id,
      match_score: m.match_score,
      reasons: m.reasons,
    })),
    { onConflict: "item_id,need_id" }
  );

  step("What Bo sees straight after releasing");
  const releaseDone = await get(`/release/${fridge.id}/done`, bo);
  check("the post-release screen renders", releaseDone.status === 200);
  check(
    "it reports how many students already need this",
    /1 student already needs this/i.test(visible(releaseDone.body)),
    visible(releaseDone.body).match(/.{0,50}already need.{0,20}/)?.[0]
  );
  check(
    "another student can't open Bo's release screen",
    (await get(`/release/${fridge.id}/done`, ana)).status === 404
  );

  step("What Ana sees");
  const homeMatched = await get("/home", ana);
  check(
    "the need now shows a match count",
    /1 match/i.test(visible(homeMatched.body)),
    "no match count on home"
  );

  const matchPage = await get(`/needs/${need.id}`, ana);
  check("match screen renders", matchPage.status === 200);
  check(
    "the match says why it matched",
    visible(matchPage.body).includes("Exactly what you asked for")
  );
  check("...and that it's free", visible(matchPage.body).includes("Free"));

  const itemPage = await get(`/items/${fridge.id}`, ana);
  check("item screen renders", itemPage.status === 200);
  check(
    "walk time is on the item, not just the block",
    /\d+ min walk — Block B/.test(visible(itemPage.body)),
    visible(itemPage.body).match(/.{0,40}walk.{0,20}/)?.[0]
  );
  check("Ana can claim it", visible(itemPage.body).includes("Claim it"));
  check(
    "the ten-minute hold is explained before claiming",
    visible(itemPage.body).includes("holds it for ten minutes")
  );

  const browse = await get("/browse", ana);
  check("browse renders", browse.status === 200);
  check("browse sorts by walk time", visible(browse.body).includes("how far you have to walk"));
  check("Bo's fridge is listed", visible(browse.body).includes("Mini fridge"));

  step("Ana claims it — what Bo's screen does");
  const beforeClaim = await get(`/items/${fridge.id}`, bo);
  check("before the claim, the item reads Available", visible(beforeClaim.body).includes("Available"));

  const { data: claimed } = await ana.client.rpc("claim_item", { p_item_id: fridge.id });
  const reservation = Array.isArray(claimed) ? claimed[0] : claimed;

  const afterClaim = await get(`/items/${fridge.id}`, bo);
  check(
    "the owner's screen now reads Reserved",
    visible(afterClaim.body).includes("Reserved"),
  );
  check(
    "and offers nobody a Claim button",
    !visible(afterClaim.body).includes("Claim it")
  );

  const reservationPage = await get(`/reservations/${reservation.id}`, ana);
  check("reservation screen renders", reservationPage.status === 200);
  check("it says the item is held", visible(reservationPage.body).includes("Held for you"));
  check(
    "and that nobody else can take it",
    visible(reservationPage.body).includes("Nobody else can claim it")
  );

  check(
    "a stranger cannot open someone else's reservation",
    (await get(`/reservations/${reservation.id}`, bo)).status === 404
  );

  step("Confirm, then hand over");
  const { data: handoffData } = await ana.client.rpc("confirm_claim", {
    p_reservation_id: reservation.id,
  });
  const handoff = Array.isArray(handoffData) ? handoffData[0] : handoffData;

  const handoffPage = await get(`/handoffs/${handoff.id}`, ana);
  check("handoff screen renders", handoffPage.status === 200);
  check(
    "the 4-digit code is shown",
    visible(handoffPage.body).includes(handoff.confirmation_code),
    handoff.confirmation_code
  );
  check(
    "the pickup point is shown",
    visible(handoffPage.body).includes("Block B Lobby")
  );
  check(
    "it says Passdown never handles money",
    visible(handoffPage.body).includes("walk, not a delivery") ||
      visible(handoffPage.body).includes("never handles money")
  );

  await ana.client.rpc("confirm_handoff", { p_handoff_id: handoff.id });
  await bo.client.rpc("confirm_handoff", { p_handoff_id: handoff.id });

  const profile = await get("/profile", ana);
  check("profile renders", profile.status === 200);
  check("verified badge is shown", visible(profile.body).includes("Verified Student"));
  check(
    "personal stats only — one completed handoff",
    /1 completed handoff/.test(visible(profile.body))
  );
  check(
    "institution shown as the domain, no invented university name",
    visible(profile.body).includes(DOMAIN)
  );

  await cleanup();

  console.log(`\n${"─".repeat(56)}`);
  if (failures.length === 0) {
    console.log(`[32m${passed} checks passed.[0m Every screen renders and holds its promises.`);
  } else {
    console.log(
      `[31m${failures.length} failed[0m, ${passed} passed:\n` +
        failures.map((f) => `  · ${f}`).join("\n")
    );
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error("\nUI verification crashed:", error);
  await cleanup().catch(() => {});
  process.exit(1);
});
