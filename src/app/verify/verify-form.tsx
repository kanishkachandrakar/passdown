"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input, Notice } from "@/components/ui";
import { checkInstitutionalEmail } from "@/lib/institution";
import { localInboxUrl } from "@/lib/local-dev";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export function VerifyForm({
  next,
  linkFailed = false,
}: {
  next: string;
  linkFailed?: boolean;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    linkFailed
      ? "That sign-in link didn't work — links only open in the browser that asked for them, and only once. Enter your email and use the six-digit code instead."
      : null
  );
  const [busy, setBusy] = useState(false);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const check = checkInstitutionalEmail(email);
    if (!check.ok) {
      setError(check.reason);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: check.email,
      options: {
        shouldCreateUser: true,
        /*
          Built from the origin actually being served, not from Supabase's
          configured site_url — otherwise the link in the email points at
          whatever port was configured months ago and 404s.
        */
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setEmail(check.email);
    setStep("code");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (verifyError) {
      setBusy(false);
      setError(
        verifyError.message.toLowerCase().includes("expired")
          ? "That code has expired. Send a new one."
          : "That code isn't right. Check the six digits and try again."
      );
      return;
    }

    router.replace(next);
    router.refresh();
  }

  if (step === "email") {
    return (
      <div className="pd-in">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Passdown
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
          Verify you&rsquo;re a student
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          We send a six-digit code to your university email. That email is also
          how we know which campus you&rsquo;re on.
        </p>

        <form onSubmit={sendCode} className="mt-7 space-y-4">
          <Field
            label="University email"
            hint="Any institution, anywhere — it doesn't have to end in .edu. vit.ac.in, unam.mx and ox.ac.uk all work. Just not a personal address."
            htmlFor="email"
          >
            <Input
              id="email"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <Button type="submit" size="lg" full disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="pd-in">
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
        className="text-sm text-muted hover:text-ink"
      >
        ← Use a different email
      </button>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
        Check your email
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        We sent a six-digit code to{" "}
        <span className="break-all text-ink">{email}</span>.
      </p>

      <LocalInboxHint />

      <form onSubmit={verifyCode} className="mt-7 space-y-4">
        <Field label="Six-digit code" htmlFor="code">
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="tabular text-center text-2xl tracking-[0.4em]"
          />
        </Field>

        {error ? <Notice tone="danger">{error}</Notice> : null}

        <Button type="submit" size="lg" full disabled={busy || code.length < 6}>
          {busy ? "Verifying…" : "Verify and enter"}
        </Button>
      </form>
    </div>
  );
}

/**
 * Shown only when the app is talking to a local Supabase stack, where mail is
 * captured rather than sent. Without this, the first thing anyone running the
 * project does is wait for an email that was never going to arrive — and
 * conclude sign-in is broken. A deployed build pointed at a hosted project
 * renders nothing here.
 */
function LocalInboxHint() {
  const inbox = localInboxUrl();
  if (!inbox) return null;

  return (
    <div className="mt-4 rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3">
      <p className="text-sm font-medium text-warn">
        Running locally — that email never left this machine.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-warn">
        The local Supabase stack captures mail instead of sending it. Your code
        is waiting at{" "}
        <a
          href={inbox}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2"
        >
          {inbox.replace(/^https?:\/\//, "")}
        </a>
        . Any address works here — it doesn&rsquo;t have to be one you own.
      </p>
    </div>
  );
}
