/**
 * Preferences and whole-store operations: starred cards, the counters behind
 * achievements, the backup file, and the erase path.
 *
 * This file is the only one that reads more than one entity, because a backup
 * and an erase are by definition about all of them. It owns no entity shape -
 * those live in `decks.ts`, `matches.ts` and `tournaments.ts`.
 */

import { FAVORITES_KEY, STATS_KEY, DECKS_KEY, MATCHES_KEY, EVENTS_KEY, ACTIVE_GAME_KEY, INTRO_SEEN_KEY, read, write, remove } from "./keys";
import { listDecks } from "./decks";
import { listMatches } from "./matches";
import { listTournaments } from "./tournaments";

/* ─── Favorite cards (persist across games) ─── */
export function listFavoriteIds(): number[] {
  return read<number[]>(FAVORITES_KEY, []);
}
export function toggleFavorite(id: number): number[] {
  const cur = read<number[]>(FAVORITES_KEY, []);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  write(FAVORITES_KEY, next);
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
  return {
    decks: data.decks?.length ?? 0,
    matches: data.matches?.length ?? 0,
    tournaments: data.tournaments?.length ?? 0,
  };
}

// Wipe every local trace of the user's data (backlog F342). Local-first means
// there's nothing on a server to delete - clearing these keys is a full erase.
export function clearAllData() {
  [DECKS_KEY, MATCHES_KEY, FAVORITES_KEY, STATS_KEY, ACTIVE_GAME_KEY, INTRO_SEEN_KEY].forEach(remove);
}
