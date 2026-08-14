import { LinkButton } from "@/components/ui";

/**
 * Landing. Name, tagline, one supporting line, one CTA — and the two reasons
 * Passdown is not the marketplace or the group chat, because those two proofs
 * are the whole pitch.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10 sm:max-w-lg sm:py-16">
      <div className="flex flex-1 flex-col justify-center pd-in">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
          Passdown
        </p>

        <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Your campus
          <br />
          already has one.
        </h1>

        <p className="mt-5 text-[17px] leading-relaxed text-muted">
          Every August, students buy things that other students are throwing out
          four hundred metres away. Passdown puts those two people in the same
          place.
        </p>

        <div className="mt-9">
          <LinkButton href="/verify" size="lg" full>
            Enter Passdown
          </LinkButton>
          <p className="mt-3 text-center text-[13px] text-faint">
            Your university email — any institution, not just&nbsp;.edu
          </p>
        </div>

        <div className="mt-12 grid gap-3">
          <Proof
            heading="Not a city-wide marketplace"
            body="Everything is scoped to your campus and every person is a verified student. Matches are sorted by how far you have to walk."
          />
          <Proof
            heading="Not the group chat"
            body="A group chat has no state, so the same fridge gets promised to four people. Here an item can be claimed exactly once — the database enforces it."
          />
        </div>
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-[13px] text-faint">
        Built for the Stellic Pathfinders Challenge · Category 02, Overcoming
        Obstacles
      </footer>
    </main>
  );
}

function Proof({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-ink">{heading}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
