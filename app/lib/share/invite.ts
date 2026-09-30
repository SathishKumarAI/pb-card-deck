/**
 * Writer invites: asking a helper to join one event, and managing who has.
 *
 * Shares `eventShare.ts`'s token (256 bits, hashed server-side, carried in a URL
 * fragment) because an invite is the same object with a different role. What differs is
 * what holding one gets you: **nothing, until an account accepts it.** Accepting creates
 * a membership, and membership is what the database checks.
 *
 * That is why there are two separate revocations, and both are here:
 *   - `revokeShare` (in `eventShare.ts`) stops NEW people joining;
 *   - `removeMember` stops a person who already joined.
 * Doing only the first leaves everyone already in; doing only the second leaves the link
 * live. The Helpers panel shows both, side by side, for exactly that reason.
 */

import { getSupabase } from "../supabase/client";
import { newShareToken } from "./eventShare";

export interface MemberRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

/** The URL a helper opens. Fragment, not query - see `eventShare.ts`. */
export function inviteUrlFor(token: string, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/join#t=${token}`;
}

/**
 * Mint a writer invite. Shown once, like a share link, because only its hash is stored.
 * Default expiry is deliberately shorter than a viewer link: an invite that grants WRITE
 * access should not sit in a group chat for a month.
 */
export async function createInvite(
  tournamentId: string,
  expiresInDays: number | null = 1,
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
    p_label: label ?? "helpers",
    p_role: "writer",
  });
  if (error) {
    throw new Error(
      /not your event/i.test(error.message)
        ? "Only the person who created this event can invite helpers."
        : "Could not create the invite. Try again.",
    );
  }
  return { id: String(data), token, url: inviteUrlFor(token) };
}

export type AcceptResult =
  | { ok: true; tournamentId: string }
  | { ok: false; reason: "no-token" | "signed-out" | "invalid" | "offline" | "unconfigured" | "error" };

/**
 * Accept an invite. Every failure is a reason the page can state, and "invalid" covers
 * unknown, expired, revoked and "that is a view link, not an invite" - the database does
 * not distinguish them, so neither does this.
 */
export async function acceptInvite(token: string | null, signedIn: boolean): Promise<AcceptResult> {
  if (!token) return { ok: false, reason: "no-token" };
  if (!signedIn) return { ok: false, reason: "signed-out" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline" };
  }
  const sb = await getSupabase();
  if (!sb) return { ok: false, reason: "unconfigured" };
  const { data, error } = await sb.rpc("accept_event_invite", { p_token: token });
  if (error) {
    return { ok: false, reason: /invalid invite/i.test(error.message) ? "invalid" : "error" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  return { ok: true, tournamentId: String(data) };
}

export async function listMembers(tournamentId: string): Promise<MemberRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_event_members", { p_tournament_id: tournamentId });
  if (error) throw new Error("Could not load this event's helpers.");
  return (data as MemberRow[]) ?? [];
}

export async function removeMember(tournamentId: string, userId: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("remove_event_member", {
    p_tournament_id: tournamentId,
    p_user_id: userId,
  });
  if (error) throw new Error("Could not remove that helper. Try again.");
}

/** A helper removing themselves. */
export async function leaveEvent(tournamentId: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("leave_event", { p_tournament_id: tournamentId });
  if (error) throw new Error("Could not leave that event. Try again.");
}

/** How a member is best named on screen: a display name, else an email, else neither. */
export function memberLabel(m: MemberRow): string {
  return m.display_name?.trim() || m.email?.trim() || "A helper";
}
