"use client";

/**
 * The helper's way in: open an invite link, sign in if you are not, and the event
 * appears in your app.
 *
 * Deliberately a single screen with one action. A helper is standing on a court with a
 * phone; anything more than "sign in, tap Join" is too much.
 *
 * Two things it does that are not obvious:
 *
 * 1. **It does not accept the invite until you are signed in**, and it says so rather
 *    than failing. Accepting is what grants write access, and that has to attach to an
 *    account.
 * 2. **It keeps the token in the fragment across the sign-in round trip.** A magic link
 *    or Google redirect returns to the origin, so the page re-reads `location.hash` when
 *    the session appears and accepts then - which is why the token must not be in the
 *    query string, where the OAuth redirect would drop it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus, AlertTriangle, Check, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useAuth, signInWithGoogle, sendMagicLink } from "@/lib/auth";
import { tokenFromHash } from "@/lib/share/eventShare";
import { acceptInvite, type AcceptResult } from "@/lib/share/invite";
import { requestSync } from "@/lib/sync/runtime";

export default function JoinEventPage() {
  const auth = useAuth();
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [working, setWorking] = useState(false);
  const [email, setEmail] = useState("");
  const tokenRef = useRef<string | null>(null);
  const attempted = useRef(false);

  const accept = useCallback(async () => {
    if (working) return;
    setWorking(true);
    const r = await acceptInvite(tokenRef.current, auth.status === "signed-in");
    setResult(r);
    setWorking(false);
    // The event is in the account now; pull it so it appears without a manual refresh.
    if (r.ok) requestSync(0);
  }, [auth.status, working]);

  useEffect(() => {
    tokenRef.current = tokenFromHash(window.location.hash);
    if (!tokenRef.current) setResult({ ok: false, reason: "no-token" });
  }, []);

  // Accept automatically once, as soon as there is a session - the helper has already
  // said yes by opening the link.
  useEffect(() => {
    if (auth.status === "signed-in" && tokenRef.current && !attempted.current) {
      attempted.current = true;
      void accept();
    }
  }, [auth.status, accept]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink(email);
  };

  return (
    <main className="app-col mx-auto px-4 py-8" style={{ minHeight: "100dvh" }}>
      <h1 className="font-display text-2xl font-bold flex items-center gap-2 mb-2" style={{ color: "var(--text)" }}>
        <UserPlus size={22} style={{ color: "var(--accent)" }} /> Join an event
      </h1>

      {result?.ok ? (
        <div className="mat-thin rounded-[var(--r-panel)] p-4">
          <p className="font-semibold flex items-center gap-2 mb-1" style={{ color: "var(--text)" }}>
            <Check size={16} style={{ color: "var(--accent)" }} /> You are in
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            The event is in your app under <strong>Tournaments</strong>. You can enter and
            correct scores; the organiser keeps the draw, the format and the event itself.
            Every score you enter is logged under your name.
          </p>
          <Link
            href="/"
            className="pressable inline-block px-4 py-2.5 rounded-[var(--r-ctl)] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Open the event
          </Link>
        </div>
      ) : auth.status === "signed-in" ? (
        <div className="mat-thin rounded-[var(--r-panel)] p-4">
          {working ? (
            <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <Loader2 size={15} className="anim-spin" /> Joining…
            </p>
          ) : (
            <Problem reason={result && !result.ok ? result.reason : "error"} onRetry={accept} />
          )}
        </div>
      ) : auth.status === "link-sent" ? (
        <div className="mat-thin rounded-[var(--r-panel)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>Check your inbox</p>
          <p>
            If <strong>{auth.email}</strong> can receive mail, a sign-in link is on its
            way. <strong>Open it on this device</strong> — you will come back here and
            join automatically.
          </p>
        </div>
      ) : auth.status === "unconfigured" ? (
        <Problem reason="unconfigured" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="mat-thin rounded-[var(--r-panel)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
              Sign in to join
            </p>
            <p>
              Entering scores for someone else&apos;s event needs an account, so the
              change log can say who entered what. It takes one tap and no password.
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="pressable hoverable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <ShieldCheck size={16} /> Continue with Google
          </button>

          <form onSubmit={sendLink} className="flex flex-col gap-2">
            <label htmlFor="join-email" className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Or get a sign-in link by email
            </label>
            <input
              id="join-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 rounded-[var(--r-ctl)] text-base"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              className="pressable hoverable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] font-semibold"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <Mail size={16} /> Email me a link
            </button>
          </form>

          {auth.error && (
            <p role="alert" className="text-sm flex items-start gap-2" style={{ color: "var(--red)" }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {auth.error}
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-xs" style={{ color: "var(--text-muted)" }}>
        Only the organiser can invite helpers, and they can remove one at any time.{" "}
        <Link href="/" style={{ color: "var(--accent)" }}>What is PB Card Deck?</Link>
      </p>
    </main>
  );
}

function Problem({ reason, onRetry }: { reason: Exclude<AcceptResult, { ok: true }>["reason"]; onRetry?: () => void }) {
  const copy: Record<typeof reason, { title: string; body: string }> = {
    "no-token": {
      title: "This invite is incomplete",
      body: "The part after the # is missing, which usually means the link was cut short when it was copied. Ask the organiser to send it again.",
    },
    invalid: {
      title: "This invite no longer works",
      body: "It has expired, been revoked, or it is a view-only link rather than an invite. Ask the organiser for a new one.",
    },
    "signed-out": {
      title: "Sign in first",
      body: "Joining attaches write access to your account, so it needs one.",
    },
    offline: {
      title: "You are offline",
      body: "Joining needs a connection. Try again once you are back on a network.",
    },
    unconfigured: {
      title: "Invites are not enabled here",
      body: "This copy of the app has no account service connected, so it cannot join a shared event.",
    },
    error: {
      title: "Could not join",
      body: "Something went wrong reaching the event. It is worth trying again.",
    },
  };
  const { title, body } = copy[reason];
  return (
    <div>
      <p className="font-semibold flex items-center gap-2 mb-1" style={{ color: "var(--text)" }}>
        <AlertTriangle size={16} style={{ color: "var(--red)" }} /> {title}
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{body}</p>
      <div className="flex gap-2">
        {onRetry && reason !== "unconfigured" && reason !== "no-token" && (
          <button
            onClick={onRetry}
            className="pressable px-3 py-2 rounded-[var(--r-ctl)] text-sm font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Try again
          </button>
        )}
        <Link
          href="/"
          className="pressable px-3 py-2 rounded-[var(--r-ctl)] text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Open the app
        </Link>
      </div>
    </div>
  );
}
