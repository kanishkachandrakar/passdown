"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [localCode, setLocalCode] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const check = checkInstitutionalEmail(email);
    if (!check.ok) {
      setError(check.reason);
      return;
    }

    setBusy(true);

    /*
      The demo account never sends mail: its code is minted server-side by
      generateLink. Going through signInWithOtp would burn a message against
      the project's hourly email limit — which is exactly what stops somebody
      evaluating this from getting in.
    */
    const openSignin = process.env.NEXT_PUBLIC_DEMO_OPEN_SIGNIN === "true";
    const demoEmail = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL?.toLowerCase();
    if (openSignin || (demoEmail && check.email === demoEmail)) {
      setBusy(false);
      setEmail(check.email);
      setStep("code");
      setLocalCode(null);
      return;
    }

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
      setError(
        /rate limit/i.test(sendError.message)
          ? "Too many sign-in emails from this project in the last hour. Wait a little, or use the demo account below — it doesn't send email at all."
          : sendError.message,
      );
      return;
    }

    setEmail(check.email);
    setStep("code");
    setLocalCode(null);
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
          : "That code isn't right. Check the six digits and try again.",
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

        <DemoAccountPrompt onUse={setEmail} />
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

      <CodeHelper
        email={email}
        code={localCode}
        onCode={setLocalCode}
        onUse={setCode}
      />

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
/**
 * For anyone evaluating this: fills in the demo address, whose code is then
 * shown on the next screen. Renders nothing unless a demo account is
 * configured, so it never appears on a real campus deployment.
 */
function DemoAccountPrompt({ onUse }: { onUse: (email: string) => void }) {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL;
  const openSignin = process.env.NEXT_PUBLIC_DEMO_OPEN_SIGNIN === "true";

  // With open sign-in there is nothing to suggest — any address works and the
  // code appears on the next screen either way.
  if (openSignin) {
    return (
      <div className="mt-6 rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3">
        <p className="text-sm font-medium text-warn">Demo deployment</p>
        <p className="mt-1 text-sm leading-relaxed text-warn">
          Use any university email — real or made up. Your sign-in code is shown
          on the next screen instead of being emailed, so you don&rsquo;t need
          access to the inbox.
        </p>
      </div>
    );
  }

  if (!demoEmail) return null;

  return (
    <div className="mt-6 rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3">
      <p className="text-sm font-medium text-warn">Just looking round?</p>
      <p className="mt-1 text-sm leading-relaxed text-warn">
        Use the demo account — its sign-in code is shown on screen, so you
        don&rsquo;t need an inbox.
      </p>
      <button
        type="button"
        onClick={() => onUse(demoEmail)}
        className="mt-2 rounded-lg border border-warn/25 bg-surface px-3 py-2 text-sm font-medium text-warn hover:bg-warn/10"
      >
        Use {demoEmail}
      </button>
    </div>
  );
}

/**
 * Shows the sign-in code without needing an inbox, in two situations:
 *
 *   - running locally, where mail is captured by Mailpit rather than sent
 *   - for the one designated demo account on a deployment, so somebody
 *     evaluating this can get in without an inbox of ours
 *
 * Any other address on a deployment gets nothing at all — printing codes on
 * request would be an authentication bypass, not a convenience.
 */
function CodeHelper({
  email,
  code,
  onCode,
  onUse,
}: {
  email: string;
  code: string | null;
  onCode: (code: string | null) => void;
  onUse: (code: string) => void;
}) {
  const inbox = localInboxUrl();
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL?.toLowerCase();
  const isDemoAccount = Boolean(
    demoEmail && email.trim().toLowerCase() === demoEmail,
  );
  const shown = Boolean(inbox) || isDemoAccount;

  // Poll briefly — the email lands a moment after the
  // request returns. Gives up quietly; the code can always be typed by hand.
  useEffect(() => {
    if (!shown || !email || code) return;
    let cancelled = false;
    let tries = 0;

    const look = async () => {
      tries += 1;
      try {
        const endpoint = isDemoAccount
          ? "/api/demo-code"
          : "/api/dev/latest-code";
        const r = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`);
        const data = await r.json();
        if (!cancelled && data.code) {
          onCode(data.code);
          return;
        }
      } catch {
        // ignore — this is a convenience, not a dependency
      }
      if (!cancelled && tries < 10) setTimeout(look, 700);
    };

    look();
    return () => {
      cancelled = true;
    };
  }, [shown, isDemoAccount, email, code, onCode]);

  if (!shown) return null;

  return (
    <div className="mt-4 rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3">
      <p className="text-sm font-medium text-warn">
        {inbox
          ? "Running locally — that email never left this machine."
          : "Demo — your code is shown here, not emailed."}
      </p>

      {code ? (
        <>
          <p className="mt-1 text-sm text-warn">
            For demo purposes, here is your code:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="tabular rounded-lg border border-warn/25 bg-surface px-3 py-1.5 text-2xl font-semibold tracking-[0.25em] text-ink">
              {code}
            </span>
            <button
              type="button"
              onClick={() => onUse(code)}
              className="rounded-lg border border-warn/25 bg-surface px-3 py-2 text-sm font-medium text-warn hover:bg-warn/10"
            >
              Use it
            </button>
          </div>
        </>
      ) : !inbox ? (
        <p className="mt-1 text-sm leading-relaxed text-warn">
          Fetching your code…
        </p>
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-warn">
          Fetching your code from the local mail catcher… or read it yourself at{" "}
          <a
            href={inbox}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            {inbox.replace(/^https?:\/\//, "")}
          </a>
          .
        </p>
      )}

      <p className="mt-2 text-[12px] text-warn/80">
        {inbox
          ? "Any address works here — it doesn't have to be one you own."
          : "This is a demo deployment, so codes are shown rather than emailed."}
      </p>
    </div>
  );
}
