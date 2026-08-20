import Link from "next/link";

import { PICKUP_LOCATIONS } from "@/lib/campus";
import { requireProfile } from "@/lib/session";
import { CATEGORIES, CONDITIONS } from "@/lib/types";
import { ReleaseForm } from "./release-form";

export const metadata = { title: "Release an item — Passdown" };

export default async function ReleasePage() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto max-w-lg pd-in">
      <Link href="/home" className="text-sm text-muted hover:text-ink">
        ← Home
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        What are you done with?
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
        A minute of typing beats carrying it to a skip. You&rsquo;ll see how many
        students are already waiting for it as soon as you post.
      </p>

      <ReleaseForm
        userId={profile.id}
        categories={[...CATEGORIES]}
        conditions={CONDITIONS}
        pickupLocations={PICKUP_LOCATIONS}
        defaultPickup={
          PICKUP_LOCATIONS.find((p) => p.areaId === profile.campus_area)?.id ??
          PICKUP_LOCATIONS[0].id
        }
      />
    </div>
  );
}
