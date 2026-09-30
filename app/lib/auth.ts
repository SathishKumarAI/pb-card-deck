"use client";

/**
 * Sign in, sign out, and delete the account. Nothing else.
 *
 * This file owns the auth state machine and the two ways in: Google, and an email
 * magic link. It owns no game data, no sync and no UI. `components/AccountPanel`
 * renders what is here; `lib/sync/*` (stage 4) reacts to it.
 *
 * Why no passwords: a magic link reaches any mailbox - Gmail, Yahoo, Outlook, a
 * work address - without this app ever storing a credential that can be reused,
 * leaked, or need a reset flow. The security surface it removes is the point.
 *
 * Two rules the code below keeps deliberately:
 *
 * - **Never reveal whether an email has an account.** The reply to a link request
 *   is always the same sentence. Supabase's own response is identical either way;
 *   the UI must not undo that by saying "welcome back".
 * - **The state machine is pure and tested** (`nextAuthState`), so the awkward
 *   transitions - a link sent then abandoned, a session appearing while a link is
 *   outstanding, an account deleted on another device - are checked by
 *   `lib/auth.test.ts` rather than by clicking.
 */

import { useSyncExternalStore } from "react";
import { getSupabase, isCloudConfigured } from "./supabase/client";

export type AuthStatus =
  /** No project configured: this deployment has no cloud at all. */
  | "unconfigured"
  /** Asking Supabase whether there is a session. */
  | "loading"
  | "signed-out"
  /** A magic link was sent and not yet used. */
  | "link-sent"
  | "signed-in"
  /** A sign-in or a deletion is in flight. */
  | "working";

export interface AuthState {
  status: AuthStatus;
  email: string | null;
  userId: string | null;
  /** Shown to the user. Always a sentence someone can act on. */
  error: string | null;
}

export type AuthEvent =
  | { type: "no-cloud" }
  | { type: "checking" }
  | { type: "session"; userId: string; email: string | null }
  | { type: "no-session" }
  | { type: "link-sent"; email: string }
  | { type: "working" }
  | { type: "error"; message: string };

export const INITIAL_AUTH: AuthState = {
  status: isCloudConfigured() ? "loading" : "unconfigured",
  email: null,
  userId: null,
  error: null,
};

/**
 * The whole machine, pure. One rule worth naming: a `session` event always wins.
 * It is the only event that can arrive from another tab or from a link opened
 * elsewhere, and treating it as authoritative is what stops a stale "check your
 * inbox" screen sitting in front of a signed-in app.
 */
export function nextAuthState(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "no-cloud":
      return { status: "unconfigured", email: null, userId: null, error: null };
    case "checking":
      return { ...state, status: "loading", error: null };
    case "session":
      return { status: "signed-in", userId: event.userId, email: event.email, error: null };
    case "no-session":
      // Keep "link sent" on screen: a session check resolving to nothing does not
      // mean the link failed, it means it has not been opened yet.
      return state.status === "link-sent"
        ? { ...state, error: null }
        : { status: "signed-out", email: null, userId: null, error: null };
    case "link-sent":
      return { status: "link-sent", email: event.email, userId: null, error: null };
    case "working":
      return { ...state, status: "working", error: null };
    case "error":
      // An error never invents a session, and never loses one.
      return {
        ...state,
        status: state.status === "signed-in" ? "signed-in" : state.userId ? "signed-in" : "signed-out",
        error: event.message,
      };
  }
}

/* ─── email, validated at the boundary ─── */

/**
 * Normalise and check an address before it goes anywhere. Deliberately strict
 * about shape and length (RFC 5321's 254) and deliberately not clever: this is a
 * guard against a typo and against junk being posted, not an existence check.
 */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@,;:<>()[\]\\"]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null;
  return email;
}

/** Seconds a user must wait before another link can be requested. */
export const LINK_COOLDOWN_SECONDS = 60;

export function linkCooldownRemaining(lastSentAt: number | null, now: number): number {
  if (!lastSentAt) return 0;
  const elapsed = Math.floor((now - lastSentAt) / 1000);
  return Math.max(0, LINK_COOLDOWN_SECONDS - elapsed);
}

/* ─── the store ─── */

let state: AuthState = INITIAL_AUTH;
const listeners = new Set<() => void>();
let started = false;

function dispatch(event: AuthEvent) {
  const next = nextAuthState(state, event);
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

export function getAuthState(): AuthState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void startAuth();
  return () => listeners.delete(listener);
}

/**
 * Watch the session from outside React (the sync runtime does). Fires immediately
 * with the current state, so a subscriber never has to ask separately.
 */
export function subscribeAuth(cb: (state: AuthState) => void): () => void {
  const listener = () => cb(state);
  listeners.add(listener);
  void startAuth();
  cb(state);
  return () => listeners.delete(listener);
}

/** React binding. Returns the same object identity until something changes. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuthState, () => INITIAL_AUTH);
}

/** Attach to Supabase once: current session, then every later change. */
export async function startAuth() {
  if (started) return;
  started = true;
  if (!isCloudConfigured()) {
    dispatch({ type: "no-cloud" });
    return;
  }
  const sb = await getSupabase();
  if (!sb) {
    dispatch({ type: "no-cloud" });
    return;
  }
  const { data } = await sb.auth.getSession();
  if (data.session?.user) {
    dispatch({ type: "session", userId: data.session.user.id, email: data.session.user.email ?? null });
  } else {
    dispatch({ type: "no-session" });
  }
  sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      dispatch({ type: "session", userId: session.user.id, email: session.user.email ?? null });
    } else {
      dispatch({ type: "no-session" });
    }
  });
}

/* ─── the three actions ─── */

/** Where Supabase sends people back to. Must be on the project's allowlist exactly. */
function redirectTarget(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

export async function signInWithGoogle(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return dispatch({ type: "error", message: "This app is not connected to an account service." });
  dispatch({ type: "working" });
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTarget() },
  });
  if (error) dispatch({ type: "error", message: "Could not reach Google just now. Try again, or use an email link." });
}

/**
 * Send a sign-in link. Creates the account if there is none - which is why the
 * reply cannot say which happened, and why the UI says the same sentence either
 * way.
 */
export async function sendMagicLink(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email) return dispatch({ type: "error", message: "That does not look like an email address." });
  const sb = await getSupabase();
  if (!sb) return dispatch({ type: "error", message: "This app is not connected to an account service." });
  dispatch({ type: "working" });
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTarget() },
  });
  if (error) {
    const tooMany = /rate|too many|limit/i.test(error.message);
    return dispatch({
      type: "error",
      message: tooMany
        ? "Too many links requested. Wait a minute and try again."
        : "Could not send the link. Check the address and try again.",
    });
  }
  dispatch({ type: "link-sent", email });
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  dispatch({ type: "no-session" });
}

/**
 * Delete the account and everything in it. The database function does the work
 * (it takes no arguments and derives the account from the session, so it can only
 * ever delete the caller); this signs out globally afterwards, so a session on
 * another device cannot keep using a token for an account that no longer exists.
 */
export async function deleteAccount(): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  dispatch({ type: "working" });
  const { error } = await sb.rpc("delete_my_account");
  if (error) {
    dispatch({ type: "error", message: "Could not delete the account. Nothing was changed - try again." });
    return false;
  }
  await sb.auth.signOut({ scope: "global" });
  dispatch({ type: "no-session" });
  return true;
}

/** Test seam. */
export function resetAuthForTests(next: AuthState = INITIAL_AUTH) {
  state = next;
  started = false;
  listeners.clear();
}
