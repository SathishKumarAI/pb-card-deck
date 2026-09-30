/**
 * Preferences and whole-store operations: starred cards, the counters behind
 * achievements, the backup file, and the erase path.
 *
 * This file is the only one that reads more than one entity, because a backup
 * and an erase are by definition about all of them. It owns no entity shape -
 * those live in `decks.ts`, `matches.ts` and `tournaments.ts`.
 */

import { FAVORITES_KEY, STATS_KEY, DECKS_KEY, MATCHES_KEY, EVENTS_KEY, USER_DATA_KEYS, read, write, remove } from "./keys";
import { listDecks } from "./decks";
import { listMatches } from "./matches";
import { listTournaments } from "./tournaments";
import { enqueue } from "../sync/outbox";

/** There is one prefs row per account, so the queue only ever needs one id. */
export const PREFS_ROW = "me";

/* ─── Favorite cards (persist across games) ─── */
export function listFavoriteIds(): number[] {
  return read<number[]>(FAVORITES_KEY, []);
}
export function toggleFavorite(id: number): number[] {
  const cur = read<number[]>(FAVORITES_KEY, []);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  write(FAVORITES_KEY, next);
  enqueue("prefs", PREFS_ROW);
  return next;
}

/* ─── Lightweight event stats for achievements (backlog F121) ─── */
export function getStats(): Record<string, number> {
  return read<Record<string, number>>(STATS_KEY, {});
}
export function bumpStat(key: string, n = 1) {
  const s = read<Record<string, number>>(STATS_KEY, {});
  s[key] = (s[key] || 0) + n;
  write(STATS_KEY, s);
  enqueue("prefs", PREFS_ROW);
}

/* ─── Export / import (backup) ─── */
export function exportData(): string {
  return JSON.stringify(
    {
      version: 2,
      decks: listDecks(),
      matches: listMatches(),
      favorites: listFavoriteIds(),
      tournaments: listTournaments(),
    },
    null,
    2
  );
}
export function importData(json: string): { decks: number; matches: number; tournaments: number } {
  const data = JSON.parse(json);
  if (Array.isArray(data.decks)) write(DECKS_KEY, data.decks);
  if (Array.isArray(data.matches)) write(MATCHES_KEY, data.matches);
  if (Array.isArray(data.favorites)) write(FAVORITES_KEY, data.favorites);
  // v1 backups predate tournaments; leave whatever is on this device alone.
  if (Array.isArray(data.tournaments)) write(EVENTS_KEY, data.tournaments);
  // A restored backup is a local change like any other: queue all of it, or the
  // account would keep whatever it had and the import would look like it failed.
  for (const d of listDecks()) enqueue("decks", d.id);
  for (const m of listMatches()) enqueue("matches", m.id);
  enqueue("prefs", PREFS_ROW);
  return {
    decks: data.decks?.length ?? 0,
    matches: data.matches?.length ?? 0,
    tournaments: data.tournaments?.length ?? 0,
  };
}

/* ─── applied BY the sync engine, never by the UI (see store/decks.ts) ─── */

/**
 * Write prefs that came back from the account. Does NOT enqueue: the merge that
 * produced this already happened in the engine, and queueing here would push the
 * same row back for ever.
 */
export function applyRemotePrefs(p: { favorites: number[]; stats: Record<string, number> }) {
  write(FAVORITES_KEY, p.favorites);
  write(STATS_KEY, p.stats);
}

/**
 * Wipe every local trace of the user's data (backlog F342). With no account
 * there is nothing on a server to delete, so clearing these keys IS the erase -
 * which is why it enumerates `USER_DATA_KEYS` instead of a hand-written list.
 * The hand-written list is how events, saved games and the local feedback copy
 * survived an erase for three months (`store/erase.test.ts`).
 *
 * Preferences are left alone on purpose - see `PREFERENCE_KEYS`.
 */
export function clearAllData() {
  USER_DATA_KEYS.forEach(remove);
}
