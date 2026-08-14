"use client";

import { Button } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const misconfigured = error.message.includes("Supabase is not configured");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {misconfigured ? "Passdown isn't connected yet" : "That didn't work"}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {misconfigured
          ? "Copy .env.example to .env.local, fill in your Supabase URL and keys, and restart the dev server."
          : "Something broke on our side. Trying again usually sorts it."}
      </p>
      <div className="mt-6">
        <Button onClick={reset} size="lg" full>
          Try again
        </Button>
      </div>
    </main>
  );
}
