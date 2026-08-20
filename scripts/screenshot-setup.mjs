/**
 * Sets up a realistic signed-in state and prints the session cookie plus the
 * paths worth looking at, as JSON. Feeds the screenshot pass — see
 * scripts/README.md.
 *
 *   node --env-file=.env.local scripts/screenshot-setup.mjs > shots.json
 *
 * Everything it writes is torn down by `node scripts/screenshot-setup.mjs --clean`.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { matchItemToNeeds } from "../src/lib/matching.ts";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL_, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DOMAIN = "vit.ac.in";
const PASSWORD = "passdown-shots-4417";
const PEOPLE = {
  ana: { email: `shots.ana@${DOMAIN}`, name: "Ana Sharma", area: "block-a" },
  bo: { email: `shots.bo@${DOMAIN}`, name: "Bo Adeyemi", area: "block-b" },
};

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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

async function signIn({ email, name, area }) {
  const { data } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  await admin.from("profiles").update({ campus_area: area }).eq("id", data.user.id);

  const auth = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session } = await auth.auth.signInWithPassword({ email, password: PASSWORD });

  const jar = [];
  const ssr = createServerClient(URL_, ANON, {
    cookies: { getAll: () => [], setAll: (c) => jar.push(...c) },
  });
  await ssr.auth.setSession({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });

  return { id: data.user.id, client: auth, cookies: jar };
}

if (process.argv.includes("--clean")) {
  await cleanup();
  console.error("cleaned up");
  process.exit(0);
}

await cleanup();
const ana = await signIn(PEOPLE.ana);
const bo = await signIn(PEOPLE.bo);

// Ana wants two things; one of them Bo has.
const { data: fridgeNeed } = await ana.client
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

await ana.client.from("needs").insert({
  user_id: ana.id,
  item_name: "Scientific calculator",
  category: "Books & Study",
  free_only: false,
  max_price: 25,
  needed_by: dayOffset(30),
});

const supply = [
  {
    name: "Mini fridge",
    category: "Dorm",
    condition: "good",
    is_free: true,
    price: 0,
    pickup_location: "block-b-lobby",
    description: "Works fine, door seal is a bit loose. Cleaned it out already.",
  },
  {
    name: "Desk lamp",
    category: "Dorm",
    condition: "like_new",
    is_free: true,
    price: 0,
    pickup_location: "library-entrance",
  },
  {
    name: "Monitor",
    category: "Electronics",
    condition: "good",
    is_free: false,
    price: 45,
    pickup_location: "student-center",
  },
];

const items = [];
for (const item of supply) {
  const { data } = await bo.client
    .from("items")
    .insert({ ...item, owner_id: bo.id, available_until: dayOffset(21) })
    .select()
    .single();
  items.push(data);
}

const fridge = items[0];

// Same matcher the release action runs.
const { data: openNeeds } = await admin
  .from("needs")
  .select("*, profiles!inner(campus_area)")
  .eq("status", "open")
  .neq("user_id", bo.id);

for (const item of items) {
  const results = matchItemToNeeds(
    { ...item, price: Number(item.price) },
    (openNeeds ?? []).map((n) => ({ ...n, campus_area: n.profiles?.campus_area ?? null })),
    item.pickup_location === "block-b-lobby" ? "block-b" : "library"
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
}

// Ana holds the fridge, so the reservation screen has a live countdown.
const { data: claimed } = await ana.client.rpc("claim_item", { p_item_id: fridge.id });
const reservation = Array.isArray(claimed) ? claimed[0] : claimed;

// A second item, all the way through to a handoff with a code.
const { data: lampClaim } = await ana.client.rpc("claim_item", {
  p_item_id: items[1].id,
});
const lampReservation = Array.isArray(lampClaim) ? lampClaim[0] : lampClaim;
const { data: handoffData } = await ana.client.rpc("confirm_claim", {
  p_reservation_id: lampReservation.id,
});
const handoff = Array.isArray(handoffData) ? handoffData[0] : handoffData;

const cookieHeader = (jar) =>
  jar.map((c) => `${c.name}=${c.value}`).join("; ");

console.log(
  JSON.stringify(
    {
      viewers: {
        ana: ana.cookies.map((c) => ({ name: c.name, value: c.value })),
        bo: bo.cookies.map((c) => ({ name: c.name, value: c.value })),
      },
      cookieHeaders: { ana: cookieHeader(ana.cookies), bo: cookieHeader(bo.cookies) },
      shots: [
        { name: "01-home", path: "/home", as: "ana" },
        { name: "02-need-new", path: "/need/new", as: "ana" },
        { name: "03-release", path: "/release", as: "bo" },
        { name: "04-matches", path: `/needs/${fridgeNeed.id}`, as: "ana" },
        { name: "05-item-available", path: `/items/${items[2].id}`, as: "ana" },
        { name: "06-item-locked-other-tab", path: `/items/${fridge.id}`, as: "bo" },
        { name: "07-reservation", path: `/reservations/${reservation.id}`, as: "ana" },
        { name: "08-handoff", path: `/handoffs/${handoff.id}`, as: "ana" },
        { name: "09-browse", path: "/browse", as: "ana" },
        { name: "10-profile", path: "/profile", as: "ana" },
        { name: "11-release-done", path: `/release/${fridge.id}/done`, as: "bo" },
      ],
    },
    null,
    2
  )
);
