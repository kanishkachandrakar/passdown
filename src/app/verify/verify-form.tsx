"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input, Notice } from "@/components/ui";
import { checkInstitutionalEmail } from "@/lib/institution";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      options: { shouldCreateUser: true },
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
            hint="Any institution — vit.ac.in, unam.mx, ox.ac.uk, nyu.edu. Not a personal address."
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
        We sent a six-digit code to <span className="text-ink">{email}</span>.
      </p>

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
