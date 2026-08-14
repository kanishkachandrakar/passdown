import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Not here any more
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Items come off the board when they&rsquo;re claimed, withdrawn, or their
        window runs out. That&rsquo;s working as intended.
      </p>
      <div className="mt-6">
        <LinkButton href="/home" size="lg" full>
          Back to home
        </LinkButton>
      </div>
    </main>
  );
}
