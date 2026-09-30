/**
 * Tournaments (events) in local storage.
 *
 * An event is one JSON blob - teams, schedule and every result - so saving is a
 * whole-object write. A 50-player event is around 40 KB, well inside the
 * localStorage budget, and it keeps the engine free of storage concerns.
 *
 * This file owns event storage only. Formats, brackets and standings live in
 * `lib/tournament/`.
 */

import type { Tournament } from "../tournament/types";
import { EVENTS_KEY, read, write } from "./keys";
import { enqueue } from "../sync/outbox";

export function listTournaments(): Tournament[] {
  return read<Tournament[]>(EVENTS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function getTournament(id: string): Tournament | null {
  return listTournaments().find((t) => t.id === id) ?? null;
}
export function saveTournament(t: Tournament) {
  const all = read<Tournament[]>(EVENTS_KEY, []).filter((x) => x.id !== t.id);
  write(EVENTS_KEY, [t, ...all].slice(0, 50));
  enqueue("events", t.id);
}
export function deleteTournament(id: string) {
  write(EVENTS_KEY, read<Tournament[]>(EVENTS_KEY, []).filter((t) => t.id !== id));
  enqueue("events", id, "delete");
}

/* ─── applied BY the sync engine, never by the UI (see store/decks.ts) ─── */

export function applyRemoteTournament(t: Tournament) {
  const rest = read<Tournament[]>(EVENTS_KEY, []).filter((x) => x.id !== t.id);
  write(EVENTS_KEY, [t, ...rest].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50));
}

export function dropTournamentLocally(id: string) {
  write(EVENTS_KEY, read<Tournament[]>(EVENTS_KEY, []).filter((t) => t.id !== id));
}
