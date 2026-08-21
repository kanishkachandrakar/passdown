import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/*
  Deliberately no `import "server-only"` and no dependency on
  lib/supabase/admin: scripts/seed-demo.mjs imports this file directly from
  plain Node, where that alias does not resolve. Nothing here is reachable
  from the browser anyway — SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_
  prefix, so it simply is not defined there.
*/
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase URL and SUPABASE_SERVICE_ROLE_KEY are needed to seed sample listings."
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The sample campus, in one place.
 *
 * Both `npm run seed:demo` and the "Add sample listings" button on an empty
 * Browse call into here, so the two can't drift apart.
 *
 * Everything created is flagged `is_demo`: labelled **Sample** in the UI and
 * removed outright by the Demo / Real switch. The rows go in through the same
 * tables real listings use, so they claim, lock and hand off identically.
 */

const PASSWORD = "passdown-demo-seed-8823";

export const DEMO_STUDENTS = [
  { handle: "demo.priya", name: "Priya (sample)", area: "block-a" },
  { handle: "demo.sam", name: "Sam (sample)", area: "block-c" },
  { handle: "demo.wei", name: "Wei (sample)", area: "library" },
];

/** Twelve things students actually leave behind at the end of a year. */
export const DEMO_CATALOGUE = [
  { owner: 0, name: "Mini fridge", photo: "mini-fridge", category: "Dorm", condition: "good", price: 0, pickup: "block-a-lobby", days: 18, description: "Works fine, door seal is a bit loose. Defrosted and cleaned." },
  { owner: 0, name: "Desk lamp", photo: "desk-lamp", category: "Dorm", condition: "like_new", price: 0, pickup: "block-a-lobby", days: 25 },
  { owner: 0, name: "Laundry hamper", photo: "laundry-hamper", category: "Dorm", condition: "fair", price: 0, pickup: "block-a-lobby", days: 12 },
  { owner: 0, name: "Storage bins", photo: "storage-bins", category: "Dorm", condition: "like_new", price: 0, pickup: "block-a-lobby", days: 20, description: "Three of them, stack inside each other." },
  { owner: 1, name: "Scientific calculator", photo: "scientific-calculator", category: "Books & Study", condition: "good", price: 12, pickup: "block-c-lobby", days: 30, description: "Casio fx-991. Batteries new." },
  { owner: 1, name: "Monitor", photo: "monitor", category: "Electronics", condition: "good", price: 45, pickup: "block-c-lobby", days: 14, description: "24 inch, HDMI. Cable included." },
  { owner: 1, name: "Desk chair", photo: "desk-chair", category: "Furniture", condition: "fair", price: 15, pickup: "block-c-lobby", days: 9, description: "One armrest is loose but it sits fine." },
  { owner: 1, name: "Kettle", photo: "kettle", category: "Kitchen", condition: "good", price: 6, pickup: "block-c-lobby", days: 16 },
  { owner: 2, name: "Lab goggles", photo: "lab-goggles", category: "Lab & Course Kit", condition: "like_new", price: 0, pickup: "library-entrance", days: 40, description: "Barely used — bought them for one module." },
  { owner: 2, name: "Organic chemistry textbook", photo: "chemistry-textbook", category: "Books & Study", condition: "fair", price: 18, pickup: "library-entrance", days: 35, description: "Clarke, 8th edition. Some highlighting." },
  { owner: 2, name: "Yoga mat", photo: "yoga-mat", category: "Sports", condition: "good", price: 0, pickup: "library-entrance", days: 22 },
  { owner: 2, name: "Winter coat", photo: "winter-coat", category: "Clothing", condition: "good", price: 0, pickup: "library-entrance", days: 28, description: "Size M. Warm, slightly worn at the cuffs." },
] as const;

const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Remove the sample accounts for one institution, and everything they made. */
export async function removeDemoFor(domain: string): Promise<number> {
  const admin = createAdminClient();
  const emails = new Set(DEMO_STUDENTS.map((s) => `${s.handle}@${domain}`));

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ids = (data?.users ?? [])
    .filter((u) => u.email && emails.has(u.email))
    .map((u) => u.id);
  if (!ids.length) return 0;

  const { data: items } = await admin.from("items").select("id").in("owner_id", ids);
  const itemIds = (items ?? []).map((i) => i.id);

  await admin.from("handoffs").delete().in("giver_id", ids);
  await admin.from("handoffs").delete().in("receiver_id", ids);
  if (itemIds.length) await admin.from("handoffs").delete().in("item_id", itemIds);
  await admin.from("reservations").delete().in("claimant_id", ids);
  await admin.from("needs").delete().in("user_id", ids);
  await admin.from("items").delete().in("owner_id", ids);
  for (const id of ids) await admin.auth.admin.deleteUser(id);

  return ids.length;
}

/**
 * Create the sample students and their listings for one institution.
 *
 * Scoped to a single domain because Passdown is campus-scoped: seeding the
 * wrong one produces twelve listings nobody can see.
 */
export async function seedDemoFor(domain: string): Promise<number> {
  const admin = createAdminClient();
  await removeDemoFor(domain);

  const ids: string[] = [];
  for (const student of DEMO_STUDENTS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${student.handle}@${domain}`,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: student.name },
    });
    if (error || !data.user) {
      throw new Error(`${student.handle}@${domain}: ${error?.message ?? "no user"}`);
    }

    await admin
      .from("profiles")
      .update({ campus_area: student.area, name: student.name })
      .eq("id", data.user.id);

    ids.push(data.user.id);
  }

  const rows = DEMO_CATALOGUE.map((item) => ({
    owner_id: ids[item.owner],
    name: item.name,
    category: item.category,
    condition: item.condition,
    is_free: item.price === 0,
    price: item.price,
    description: "description" in item ? item.description : null,
    pickup_location: item.pickup,
    available_until: dayOffset(item.days),
    // Served straight out of public/, so seeding needs no network and no
    // storage bucket. Credits and licences: docs/photo-credits.md
    photo_url: `/demo-photos/${item.photo}.jpg`,
    is_demo: true,
  }));

  const { error } = await admin.from("items").insert(rows);
  if (error) throw new Error(`inserting items: ${error.message}`);

  return rows.length;
}

/* ------------------------------------------------------------ auto-seeding */

/**
 * Seed a campus the first time somebody from it signs in, without asking.
 *
 * An empty Browse is technically the honest state of a brand new campus, but
 * it tells a first-time visitor nothing about what the app does. Offering a
 * button was still a question they shouldn't have to answer.
 *
 * Runs at most once per institution, ever: the check is "do the sample
 * accounts exist", not "are there any items", so clearing the board by hand
 * doesn't quietly refill it.
 */

// Domains already dealt with in this process — saves a round trip on every
// subsequent page load. In-flight promises are shared so two simultaneous
// requests can't both seed and collide.
const ensured = new Map<string, Promise<void>>();

async function alreadySeeded(domain: string): Promise<boolean> {
  const admin = createAdminClient();
  const probe = `${DEMO_STUDENTS[0].handle}@${domain}`;

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users ?? []).some((u) => u.email === probe);
}

export async function ensureDemoSeeded(domain: string): Promise<void> {
  const existing = ensured.get(domain);
  if (existing) return existing;

  const run = (async () => {
    try {
      if (await alreadySeeded(domain)) return;
      await seedDemoFor(domain);
    } catch {
      // Never let sample data break a real page render. If it fails the
      // student simply sees an empty Browse, which is the truth anyway.
      ensured.delete(domain);
    }
  })();

  ensured.set(domain, run);
  return run;
}
