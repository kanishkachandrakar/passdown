/**
 * Fills Browse with a dozen sample listings so a fresh install isn't an empty
 * grid.
 *
 *   npm run seed:demo                        # every institution with accounts
 *   npm run seed:demo -- --domain=nyu.edu    # just one
 *   npm run seed:demo -- --clean             # remove what it made
 *
 * There is also a button for this on an empty Browse page, which is the way in
 * for anyone who would rather not open a terminal. Both call the same code in
 * src/lib/demo-seed.ts.
 *
 * Passdown is campus-scoped, so a listing is only visible to people at the
 * same institution — seeding the wrong domain produces twelve items nobody can
 * see. With no --domain, this seeds every institution that already has
 * accounts, falling back to vit.ac.in on an empty database.
 */

import { createClient } from "@supabase/supabase-js";

import { seedDemoFor, removeDemoFor, DEMO_STUDENTS } from "../src/lib/demo-seed.ts";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const clean = args.includes("--clean");
const domainArg = args.find((a) => a.startsWith("--domain="))?.split("=")[1];

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function domainsToSeed() {
  if (domainArg) return [domainArg.toLowerCase()];
  const { data } = await admin.from("profiles").select("institution");
  const found = [...new Set((data ?? []).map((p) => p.institution))];
  return found.length ? found : ["vit.ac.in"];
}

for (const domain of await domainsToSeed()) {
  if (clean) {
    const removed = await removeDemoFor(domain);
    console.log(`${domain}: removed ${removed} sample accounts and their listings`);
  } else {
    const n = await seedDemoFor(domain);
    console.log(`${domain}: ${n} sample listings from ${DEMO_STUDENTS.length} sample students`);
  }
}

if (!clean) {
  console.log("\nThey're labelled in the UI and the Demo/Real switch in the header removes them.");
}
