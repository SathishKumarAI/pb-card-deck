"use client";

/**
 * The account sheet: sign in with Google, sign in with an email link, sign out,
 * delete the account.
 *
 * It owns the words and the controls. Every decision about auth lives in
 * `lib/auth.ts`, and whether there is a cloud at all in `lib/supabase/client.ts`.
 *
 * Three copy decisions that are load-bearing, not styling:
 *
 * - **The screen says what an account is FOR** before asking for anything. "Your
 *   matches survive a cleared browser and appear on your other phone" is the
 *   reason; "create an account" is not.
 * - **It says the same sentence whether the address is known or new**, because
 *   the reply must not reveal who has an account here.
 * - **It says out loud that playing without an account stays possible**, so the
 *   sheet never reads as a wall.
 */

import { useEffect, useState } from "react";
import { UserRound, Mail, LogOut, Trash2, ShieldCheck, Loader2, Inbox, AlertTriangle } from "lucide-react";
import { Sheet } from "./HistoryPanel";
import {
  useAuth,
  signInWithGoogle,
  sendMagicLink,
  signOut,
  deleteAccount,
  linkCooldownRemaining,
} from "@/lib/auth";

export default function AccountPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

  // A visible countdown, so "wait a minute" is a number rather than a guess.
  useEffect(() => {
    if (!lastSentAt) return;
    const tick = () => setCooldown(linkCooldownRemaining(lastSentAt, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSentAt]);

  if (!open) return null;

  /* Closing resets the destructive confirmation, so reopening the sheet never
     shows a half-armed "delete for ever" button. Done here rather than in an
     effect on `open`: an effect that calls setState synchronously is a cascading
     render, and every close path already goes through this function. */
  const close = () => {
    setConfirmDelete(false);
    setTyped("");
    onClose();
  };

  const busy = auth.status === "working";

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    await sendMagicLink(email);
    setLastSentAt(Date.now());
  };

  const doDelete = async () => {
    if (typed.trim().toLowerCase() !== "delete") return;
    const ok = await deleteAccount();
    if (ok) close();
  };

  return (
    <Sheet title="Account" icon={<UserRound size={18} style={{ color: "var(--accent)" }} />} onClose={close}>
      {auth.status === "unconfigured" && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          This copy of the app has no account service connected, so everything stays
          on this device. That is the normal way to use it - nothing is missing.
        </p>
      )}

      {(auth.status === "signed-out" || auth.status === "working" || auth.status === "loading") && (
        <div className="flex flex-col gap-4">
          <div className="mat-thin rounded-[var(--r-panel)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p style={{ color: "var(--text)" }} className="font-semibold mb-1">
              An account is optional
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your matches, decks and events survive a cleared browser.</li>
              <li>They appear on your other phone, tablet or laptop.</li>
              <li>You can keep playing with no account - nothing here is locked.</li>
            </ul>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="pressable hoverable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <Loader2 size={16} className="anim-spin" /> : <ShieldCheck size={16} />}
            Continue with Google
          </button>

          <form onSubmit={submitLink} className="flex flex-col gap-2">
            <label htmlFor="account-email" className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Or get a sign-in link by email
            </label>
            <input
              id="account-email"
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
              disabled={busy || cooldown > 0}
              className="pressable hoverable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] font-semibold"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                opacity: busy || cooldown > 0 ? 0.6 : 1,
              }}
            >
              <Mail size={16} />
              {cooldown > 0 ? `Send another link in ${cooldown}s` : "Email me a link"}
            </button>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No password to remember, and none for anyone to steal. Works with any
              mailbox - Gmail, Yahoo, Outlook, a work address.
            </p>
          </form>
        </div>
      )}

      {auth.status === "link-sent" && (
        <div className="flex flex-col gap-3">
          <div className="mat-thin rounded-[var(--r-panel)] p-4 flex items-start gap-3">
            <Inbox size={18} style={{ color: "var(--accent)" }} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold" style={{ color: "var(--text)" }}>
                Check your inbox
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                If <strong>{auth.email}</strong> can receive mail, a sign-in link is
                on its way. Open it on this device. The link expires shortly, and
                using it is what signs you in.
              </p>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Nothing has changed on this device yet, and you can close this and keep
            playing.
          </p>
        </div>
      )}

      {auth.status === "signed-in" && (
        <div className="flex flex-col gap-4">
          <div className="mat-thin rounded-[var(--r-panel)] p-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Signed in as
            </p>
            <p className="font-semibold break-all" style={{ color: "var(--text)" }}>
              {auth.email ?? "your account"}
            </p>
          </div>

          <button
            onClick={signOut}
            className="pressable hoverable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <LogOut size={16} /> Sign out
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="pressable flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-ctl)] text-sm font-semibold"
              style={{ background: "transparent", border: "1px solid var(--red)", color: "var(--red)" }}
            >
              <Trash2 size={15} /> Delete my account
            </button>
          ) : (
            /* The confirmation renders HERE, where the button was - a confirm strip
               that appears elsewhere on the page reads as a broken button. */
            <div className="rounded-[var(--r-panel)] p-4 flex flex-col gap-3" style={{ border: "1px solid var(--red)" }}>
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--red)" }}>
                <AlertTriangle size={15} /> This deletes the account itself
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
                <li>Every match, deck and event stored in the account is removed.</li>
                <li>It cannot be undone, and support cannot restore it.</li>
                <li>
                  What is on <em>this device</em> stays - you can keep playing without
                  an account, or export a backup first.
                </li>
              </ul>
              <label htmlFor="confirm-delete" className="text-sm" style={{ color: "var(--text)" }}>
                Type <strong>delete</strong> to confirm
              </label>
              <input
                id="confirm-delete"
                name="confirm"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full px-3 py-3 rounded-[var(--r-ctl)] text-base"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(false); setTyped(""); }}
                  className="pressable flex-1 py-2.5 rounded-[var(--r-ctl)] text-sm font-semibold"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Keep my account
                </button>
                <button
                  onClick={doDelete}
                  disabled={typed.trim().toLowerCase() !== "delete" || busy}
                  className="pressable flex-1 py-2.5 rounded-[var(--r-ctl)] text-sm font-semibold"
                  style={{
                    background: "var(--red)",
                    color: "#fff",
                    opacity: typed.trim().toLowerCase() !== "delete" || busy ? 0.5 : 1,
                  }}
                >
                  {busy ? "Deleting…" : "Delete for ever"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {auth.error && (
        <p role="alert" className="mt-4 text-sm flex items-start gap-2" style={{ color: "var(--red)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {auth.error}
        </p>
      )}
    </Sheet>
  );
}
