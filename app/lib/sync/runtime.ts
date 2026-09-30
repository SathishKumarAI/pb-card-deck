"use client";

/**
 * When sync actually runs. This is the only file that knows about both the session
 * and the engine, so `lib/auth.ts` stays about auth and `engine.ts` stays about
 * data.
 *
 * Deliberately modest about triggers - four, all of them cheap:
 *   1. a session appears (or is already there on load);
 *   2. two seconds after a local write settles, so a burst of taps is one push;
 *   3. the device comes back online, or the tab comes back to the foreground;
 *   4. every five minutes while the tab is visible, as the fallback.
 *
 * There is no realtime subscription in phase 2a. It is one person's own data, a
 * pull on those triggers is enough, and a websocket open on a court for an hour
 * costs battery for nothing.
 */

import { useSyncExternalStore } from "react";
import { getSupabase } from "../supabase/client";
import { getAuthState, type AuthState } from "../auth";
import {
  syncNow, supabaseTransport, startSyncing, stopSyncing,
  getSyncStatus, subscribeSync, type SyncStatus, type Transport,
} from "./engine";
import { pendingCount } from "./outbox";

const DEBOUNCE_MS = 2000;
const HEARTBEAT_MS = 5 * 60 * 1000;

let transport: Transport | null = null;
let debounce: ReturnType<typeof setTimeout> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let installed = false;
let signedInUser: string | null = null;

async function ensureTransport(): Promise<Transport | null> {
  if (transport) return transport;
  const sb = await getSupabase();
  if (!sb) return null;
  transport = supabaseTransport(sb as never);
  return transport;
}

/** Ask for a sync soon. Many calls in a burst collapse into one. */
export function requestSync(delay = DEBOUNCE_MS) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(async () => {
    debounce = null;
    const t = await ensureTransport();
    if (t) await syncNow(t);
  }, delay);
}

/**
 * Follow the session: start syncing when someone signs in, stop when they sign
 * out. Call once, from the app shell.
 */
export function installSyncRuntime(subscribeAuth: (cb: (s: AuthState) => void) => () => void) {
  if (installed) return () => {};
  installed = true;

  const onAuth = (state: AuthState) => {
    if (state.status === "signed-in" && state.userId) {
      if (signedInUser === state.userId) return;
      signedInUser = state.userId;
      startSyncing(state.userId);
      requestSync(0);
    } else if (signedInUser && state.status !== "working" && state.status !== "loading") {
      signedInUser = null;
      stopSyncing();
    }
  };
  onAuth(getAuthState());
  const unsubscribe = subscribeAuth(onAuth);

  const wake = () => {
    if (signedInUser) requestSync(0);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") wake();
    });
    heartbeat = setInterval(() => {
      if (document.visibilityState === "visible" && pendingCount() >= 0) wake();
    }, HEARTBEAT_MS);
  }

  return () => {
    unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
    installed = false;
  };
}

/** React binding for the status chip. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSync, getSyncStatus, () => getSyncStatus());
}

/** "Sync now", from the account sheet. */
export async function syncNowFromUi() {
  const t = await ensureTransport();
  if (t) await syncNow(t);
}

/** Test seam. */
export function resetRuntimeForTests() {
  transport = null;
  installed = false;
  signedInUser = null;
  if (debounce) clearTimeout(debounce);
  if (heartbeat) clearInterval(heartbeat);
}
