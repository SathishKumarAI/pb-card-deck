/**
 * Live share links for one event: minting, listing, revoking, and reading one as a
 * spectator.
 *
 * This file owns the token and the four calls. It owns no UI and no storage - a share
 * link is not local state, it lives in the database.
 *
 * Three properties worth knowing before changing anything here:
 *
 * 1. **The token is 256 bits and only its hash is stored.** Minting sends the token
 *    once over TLS; the database keeps `sha256(token)`. A database dump therefore
 *    yields no working links, and the token cannot be recovered to show again - which
 *    is why the UI shows it once and says so.
 * 2. **The token travels in the URL FRAGMENT** (`/shared#t=…`), never the query
 *    string. A fragment is not sent to a server, so the token stays out of access
 *    logs and out of the `Referer` header when a viewer clicks a link on the page.
 * 3. **Reading is one RPC and nothing else.** A spectator has no session; the
 *    database function is the whole anonymous surface, and it returns hand-picked
 *    columns so no account id can ride along.
 */

import type { Tournament, TournamentMatch, EventLogEntry } from "../tournament/types";
import { getSupabase, isCloudConfigured } from "../supabase/client";

/** 32 bytes, base64url, no padding: 43 characters, 256 bits of entropy. */
export function newShareToken(): string {
  const bytes = new Uint8Array(32);
  // getRandomValues, unlike crypto.subtle, works in a plain-http LAN dev session too.
  (globalThis.crypto ?? ({} as Crypto)).getRandomValues?.(bytes);
  if (bytes.every((b) => b === 0)) {
    // No CSPRNG at all: refuse rather than mint a guessable link.
    throw new Error("This browser has no secure random source, so a link cannot be created safely.");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function shareUrlFor(token: string, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/shared#t=${token}`;
}

/** Read the token out of a fragment. Accepts `#t=…` and a bare `#…`. */
export function tokenFromHash(hash: string): string | null {
  const raw = (hash || "").replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const value = params.get("t") ?? (raw.includes("=") ? null : raw);
  if (!value) return null;
  const token = value.trim();
  // Cheap shape check: the RPC rejects anything shorter anyway, and this keeps junk
  // out of a network round trip.
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
}

export interface ShareRow {
  id: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  label: string | null;
}

export type ShareState = "live" | "revoked" | "expired";

export function shareState(row: ShareRow, now = Date.now()): ShareState {
  if (row.revoked_at) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return "expired";
  return "live";
}

/* ─────────────────────────── the owner's side ─────────────────────────── */

/**
 * Mint a link. Returns the token ONCE - it cannot be fetched again, because only its
 * hash is stored. `expiresInDays` of null means it never expires.
 */
export async function createShare(
  tournamentId: string,
  expiresInDays: number | null,
  label?: string,
): Promise<{ id: string; token: string; url: string }> {
  const sb = await getSupabase();
  if (!sb) throw new Error("This app is not connected to an account service.");
  const token = newShareToken();
  const expires =
    expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const { data, error } = await sb.rpc("create_event_share", {
    p_tournament_id: tournamentId,
    p_token: token,
    p_expires_at: expires,
    p_label: label ?? null,
  });
  if (error) {
    // "not your event" is the only failure worth translating; the rest are network.
    throw new Error(
      /not your event/i.test(error.message)
        ? "Only the person who created this event can share it."
        : "Could not create the link. Try again.",
    );
  }
  return { id: String(data), token, url: shareUrlFor(token) };
}

export async function listShares(tournamentId: string): Promise<ShareRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_event_shares", { p_tournament_id: tournamentId });
  if (error) throw new Error("Could not load this event's links.");
  return (data as ShareRow[]) ?? [];
}

export async function revokeShare(shareId: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("revoke_event_share", { p_share_id: shareId });
  if (error) throw new Error("Could not revoke that link. Try again.");
}

/* ────────────────────────── the spectator's side ────────────────────────── */

/** What the database hands a viewer. Deliberately not a `Tournament` - see below. */
export interface SharedEventDoc {
  event: {
    name: string;
    format: Tournament["format"];
    entryMode: Tournament["entryMode"];
    teamSize: number;
    status: Tournament["status"];
    championTeamId: string | null;
    createdAt: string;
    config: Tournament["config"];
    players: Tournament["players"];
    teams: Tournament["teams"];
  };
  matches: (Omit<TournamentMatch, "completedAt"> & { completedAt: string | null })[];
  log: { at: string; kind: EventLogEntry["kind"]; text: string }[];
  fetchedAt: string;
}

export type SharedEventResult =
  | { ok: true; tournament: Tournament; fetchedAt: number }
  | { ok: false; reason: "no-token" | "not-found" | "offline" | "unconfigured" | "error" };

/**
 * Rebuild the `Tournament` shape the existing screens render from, so a spectator sees
 * the same standings and bracket as the organiser rather than a second implementation
 * that can drift.
 *
 * The event's local id is deliberately NOT in the payload, so a synthetic one is used:
 * nothing read-only keys on it, and inventing one here keeps the real id private.
 */
export function docToTournament(doc: SharedEventDoc): Tournament {
  return {
    id: "shared",
    name: doc.event.name,
    createdAt: new Date(doc.event.createdAt).getTime(),
    format: doc.event.format,
    entryMode: doc.event.entryMode,
    teamSize: doc.event.teamSize,
    players: doc.event.players ?? [],
    teams: doc.event.teams ?? [],
    matches: (doc.matches ?? []).map((m) => {
      // Widened through `unknown` on purpose: the wire type has `completedAt` as a
      // string, the app type as a number, and this loop is where that is reconciled.
      const match = { ...m } as unknown as TournamentMatch & { completedAt?: number | null };
      // null means "not played"; keeping the key would render an unplayed match as a
      // result, and a 0 as a score.
      for (const key of ["pool", "teamA", "teamB", "scoreA", "scoreB", "winner", "court", "label"] as const) {
        if (match[key] === null || match[key] === undefined) delete match[key];
      }
      if (m.completedAt) match.completedAt = new Date(m.completedAt).getTime();
      else delete match.completedAt;
      return match as TournamentMatch;
    }),
    config: doc.event.config,
    status: doc.event.status,
    ...(doc.event.championTeamId ? { championTeamId: doc.event.championTeamId } : {}),
    log: (doc.log ?? []).map((l) => ({ at: new Date(l.at).getTime(), kind: l.kind, text: l.text })),
  };
}

/** Fetch a shared event. Never throws: every failure is a reason the page can state. */
export async function fetchSharedEvent(token: string | null): Promise<SharedEventResult> {
  if (!token) return { ok: false, reason: "no-token" };
  if (!isCloudConfigured()) return { ok: false, reason: "unconfigured" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline" };
  }
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, reason: "unconfigured" };
    const { data, error } = await sb.rpc("get_shared_event", { p_token: token });
    if (error) return { ok: false, reason: "error" };
    // The function returns null for a bad, expired or revoked token alike - the page
    // must not guess which, because the database deliberately does not say.
    if (!data) return { ok: false, reason: "not-found" };
    const doc = data as SharedEventDoc;
    return { ok: true, tournament: docToTournament(doc), fetchedAt: new Date(doc.fetchedAt).getTime() };
  } catch {
    return { ok: false, reason: "error" };
  }
}
