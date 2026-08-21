/**
 * Fills Browse with a dozen sample listings so a fresh install isn't an empty
 * grid.
 *
 *   npm run seed:demo              # seed
 *   npm run seed:demo -- --clean   # remove everything it made
 *
 * Two things keep this honest:
 *
 *   * every row is flagged `is_demo`, labelled in the UI, and removed entirely
 *     by the Demo/Real switch in the header
 *   * the items are created through the normal API by real accounts, so they
 *     behave exactly like student listings — claimable, lockable, and subject
 *     to the same RLS as everything else
 *
 * Passdown is campus-scoped, so a listing is only visible to people at the same
 * institution. The script therefore seeds into the domains that already have
 * accounts, and falls back to vit.ac.in on an empty database. Override with
 * `--domain=your-uni.edu`.
 */

import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !SERVICE) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(URL_, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const clean = args.includes("--clean");
const domainArg = args.find((a) => a.startsWith("--domain="))?.split("=")[1];

const PASSWORD = "passdown-demo-seed-8823";

/** The sample students. Spread across blocks so walk times differ. */
const STUDENTS = [
  { handle: "demo.priya", name: "Priya (sample)", area: "block-a" },
  { handle: "demo.sam", name: "Sam (sample)", area: "block-c" },
  { handle: "demo.wei", name: "Wei (sample)", area: "library" },
];

/** Twelve things students actually leave behind at the end of a year. */
const CATALOGUE = [
  { owner: 0, name: "Mini fridge", photo: "mini-fridge",            category: "Dorm",            condition: "good",     price: 0,    pickup: "block-a-lobby",    days: 18, description: "Works fine, door seal is a bit loose. Defrosted and cleaned." },
  { owner: 0, name: "Desk lamp", photo: "desk-lamp",              category: "Dorm",            condition: "like_new", price: 0,    pickup: "block-a-lobby",    days: 25 },
  { owner: 0, name: "Laundry hamper", photo: "laundry-hamper",         category: "Dorm",            condition: "fair",     price: 0,    pickup: "block-a-lobby",    days: 12 },
  { owner: 0, name: "Storage bins", photo: "storage-bins",           category: "Dorm",            condition: "like_new", price: 0,    pickup: "block-a-lobby",    days: 20, description: "Three of them, stack inside each other." },
  { owner: 1, name: "Scientific calculator", photo: "scientific-calculator",  category: "Books & Study",   condition: "good",     price: 12,  pickup: "block-c-lobby",    days: 30, description: "Casio fx-991. Batteries new." },
  { owner: 1, name: "Monitor", photo: "monitor",                category: "Electronics",     condition: "good",     price: 45, pickup: "block-c-lobby",    days: 14, description: "24 inch, HDMI. Cable included." },
  { owner: 1, name: "Desk chair", photo: "desk-chair",             category: "Furniture",       condition: "fair",     price: 15,    pickup: "block-c-lobby",    days: 9,  description: "One armrest is loose but it sits fine." },
  { owner: 1, name: "Kettle", photo: "kettle",                 category: "Kitchen",         condition: "good",     price: 6,    pickup: "block-c-lobby",    days: 16 },
  { owner: 2, name: "Lab goggles", photo: "lab-goggles",            category: "Lab & Course Kit",condition: "like_new", price: 0,    pickup: "library-entrance", days: 40, description: "Barely used — bought them for one module." },
  { owner: 2, name: "Organic chemistry textbook", photo: "chemistry-textbook", category: "Books & Study", condition: "fair",  price: 18,  pickup: "library-entrance", days: 35, description: "Clarke, 8th edition. Some highlighting." },
  { owner: 2, name: "Yoga mat", photo: "yoga-mat",               category: "Sports",          condition: "good",     price: 0,    pickup: "library-entrance", days: 22 },
  { owner: 2, name: "Winter coat", photo: "winter-coat",            category: "Clothing",        condition: "good",     price: 0,    pickup: "library-entrance", days: 28, description: "Size M. Warm, slightly worn at the cuffs." },
];

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function domainsToSeed() {
  if (domainArg) return [domainArg.toLowerCase()];

  const { data } = await admin.from("profiles").select("institution");
  const real = [...new Set((data ?? []).map((p) => p.institution))].filter(
    (d) => !STUDENTS.some((s) => d === `${s.handle}`)
  );

  return real.length ? real : ["vit.ac.in"];
}

async function removeFor(domain) {
  const emails = new Set(STUDENTS.map((s) => `${s.handle}@${domain}`));
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ids = (data?.users ?? []).filter((u) => emails.has(u.email)).map((u) => u.id);
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

async function seedFor(domain) {
  await removeFor(domain);

  const ids = [];
  for (const student of STUDENTS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${student.handle}@${domain}`,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: student.name },
    });
    if (error) throw new Error(`${student.handle}@${domain}: ${error.message}`);

    await admin
      .from("profiles")
      .update({ campus_area: student.area, name: student.name })
      .eq("id", data.user.id);

    ids.push(data.user.id);
  }

  const rows = CATALOGUE.map((item) => ({
    owner_id: ids[item.owner],
    name: item.name,
    category: item.category,
    condition: item.condition,
    is_free: item.price === 0,
    price: item.price,
    description: item.description ?? null,
    pickup_location: item.pickup,
    available_until: dayOffset(item.days),
    // Served straight out of public/, so seeding needs no network and no
    // storage bucket. Credits and licences: docs/photo-credits.md
    photo_url: item.photo ? `/demo-photos/${item.photo}.jpg` : null,
    is_demo: true,
  }));

  const { error } = await admin.from("items").insert(rows);
  if (error) throw new Error(`inserting items: ${error.message}`);

  return rows.length;
}

const domains = await domainsToSeed();

for (const domain of domains) {
  if (clean) {
    const removed = await removeFor(domain);
    console.log(`${domain}: removed ${removed} sample accounts and their listings`);
  } else {
    const n = await seedFor(domain);
    console.log(`${domain}: ${n} sample listings from ${STUDENTS.length} sample students`);
  }
}

if (!clean) {
  console.log(
    "\nThey're labelled in the UI and the Demo/Real switch in the header removes them."
  );
}
