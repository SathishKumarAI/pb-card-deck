/**
 * The first sign-in on a device that already has data: does it come with you?
 *
 * This file owns the decision and the counts, so the dialog cannot overstate what
 * it is about to move. **The counts come from the store**, never from a guess, and
 * the same list that is counted is the list that gets queued.
 *
 * Answered once per account per device, and remembered. Saying no is not a
 * deletion: the local data stays exactly where it is, and the account simply starts
 * empty.
 */

import { read, write } from "../store/keys";
import { listDecks } from "../store/decks";
import { listMatches } from "../store/matches";
import { listFavoriteIds } from "../store/prefs";
import { listTournaments } from "../store/tournaments";
import { enqueue } from "./outbox";
import { PREFS_ROW } from "../store/prefs";

export const CLAIM_KEY = "pb-sync-claimed";

type Claims = Record<string, "uploaded" | "declined">;

export interface LocalDataCounts {
  decks: number;
  matches: number;
  events: number;
  favorites: number;
  /** True when there is nothing to ask about, so the dialog never appears empty. */
  empty: boolean;
}

export function localDataCounts(): LocalDataCounts {
  const decks = listDecks().length;
  const matches = listMatches().length;
  const events = listTournaments().length;
  const favorites = listFavoriteIds().length;
  return { decks, matches, events, favorites, empty: decks + matches + events + favorites === 0 };
}

export function claimAnswered(userId: string): boolean {
  return Boolean(read<Claims>(CLAIM_KEY, {})[userId]);
}

function remember(userId: string, answer: Claims[string]) {
  write(CLAIM_KEY, { ...read<Claims>(CLAIM_KEY, {}), [userId]: answer });
}

/** Should the dialog be shown at all? */
export function shouldAskToClaim(userId: string | null, counts = localDataCounts()): boolean {
  if (!userId) return false;
  if (counts.empty) return false;
  return !claimAnswered(userId);
}

/**
 * Yes: queue everything that is on this device. Returns what was queued, so the
 * caller can report the same numbers it promised.
 */
export function claimLocalData(userId: string): LocalDataCounts {
  const counts = localDataCounts();
  for (const d of listDecks()) enqueue("decks", d.id);
  for (const m of listMatches()) enqueue("matches", m.id);
  for (const e of listTournaments()) enqueue("events", e.id);
  enqueue("prefs", PREFS_ROW);
  remember(userId, "uploaded");
  return counts;
}

/** No: nothing moves, nothing is deleted, and we do not ask again on this device. */
export function declineClaim(userId: string) {
  remember(userId, "declined");
}
