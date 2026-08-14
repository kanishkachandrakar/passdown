import { CAMPUS_AREAS } from "@/lib/campus";
import { requireProfile } from "@/lib/session";
import { WelcomeForm } from "./welcome-form";

export const metadata = { title: "Set up — Passdown" };

export default async function WelcomePage() {
  const { profile } = await requireProfile();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="pd-in">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
          Verified · {profile.institution}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Two questions, then you&rsquo;re in
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Where you&rsquo;re based is how Passdown works out which items are a
          short walk away and which aren&rsquo;t worth showing you.
        </p>

        <WelcomeForm
          areas={CAMPUS_AREAS}
          defaultName={profile.name}
          defaultArea={profile.campus_area}
        />
      </div>
    </main>
  );
}
