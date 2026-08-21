import { LinkButton } from "@/components/ui";

/**
 * Landing. Name, tagline, one supporting line, one CTA — and the two reasons
 * Passdown is not the marketplace or the group chat, because those two proofs
 * are the whole pitch.
 */
export default function LandingPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10 sm:max-w-lg sm:py-16">
      <div className="flex flex-1 flex-col justify-center pd-in">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
            Passdown
          </span>
        </div>

        <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.03] tracking-tight text-ink sm:text-[3.25rem]">
          Your campus
          <br />
          <span className="bg-gradient-to-br from-accent via-accent-strong to-accent-deep bg-clip-text text-transparent">
            already has one.
          </span>
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
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-accent-line hover:shadow-lift">
      {/* a sliver of accent down the edge, so the cards aren't two grey boxes */}
      <span className="absolute inset-y-0 left-0 w-1 wash-accent opacity-70" />
      <p className="pl-2 text-sm font-semibold text-ink">{heading}</p>
      <p className="mt-1 pl-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
