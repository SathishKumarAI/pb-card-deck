/**
 * One local event ⇄ three tables.
 *
 * Locally a `Tournament` is a single JSON blob: teams, every match and the whole
 * change log in one object, written whole every time anything happens. In the
 * database it is a header row, **one row per match**, and an append-only log.
 *
 * That asymmetry is deliberate and this file is where it is paid for. The blob is
 * right locally (one write, no joins, the engine stays free of storage) and wrong in
 * the cloud, because phase 2c needs two people entering results for different
 * matches of the same event without overwriting each other's work. A blob column
 * would make that a last-write-wins race over the entire day's play.
 *
 * Three rules this file keeps:
 *
 * 1. **The log is append-only, so it is never re-sent and never edited.** A
 *    correction is a new line saying what the score used to be. `logSentCount`
 *    remembers how many lines of an event have gone, because the table itself will
 *    not accept an update.
 * 2. **Ids are stable across devices.** Header, match and log rows all get their
 *    UUID from `idmap`, keyed by the local id, so the same match edited on two
 *    phones is one row.
 * 3. **Reassembly is lossless for what the app reads.** `rowsToTournament` rebuilds
 *    the blob the UI expects; `eventRows.test.ts` round-trips a played-through demo
 *    event and compares every field.
 */

import type { Tournament, TournamentMatch, EventLogEntry, Format, EntryMode, Bracket } from "../tournament/types";
import { read, write } from "../store/keys";
import { cloudIdFor } from "./idmap";

export const LOG_SENT_KEY = "pb-sync-logsent";

/* ───────────────────────────── header ───────────────────────────── */

export interface EventRow {
  id: string;
  client_id: string;
  name: string;
  format: string;
  entry_mode: string;
  team_size: number;
  status: string;
  champion_team_id: string | null;
  config: Tournament["config"];
  players: Tournament["players"];
  teams: Tournament["teams"];
  created_at: string;
  deleted_at?: string | null;
}

export interface EventMatchRow {
  id: string;
  tournament_id: string;
  client_id: string;
  bracket: string;
  round: number;
  pool: string | null;
  slot_a: TournamentMatch["a"];
  slot_b: TournamentMatch["b"];
  team_a: string | null;
  team_b: string | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  court: number | null;
  label: string | null;
  played_in_app: boolean;
  completed_at: string | null;
  deleted_at?: string | null;
}

export interface EventLogRow {
  id: string;
  tournament_id: string;
  kind: EventLogEntry["kind"];
  match_id: string | null;
  text: string;
  at: string;
}

const FORMATS = new Set(["round-robin", "single-elim", "double-elim", "pools-bracket", "rotating"]);
const BRACKETS = new Set(["rr", "pool", "winners", "losers", "final"]);
const STATUSES = new Set(["setup", "running", "complete"]);
const KINDS = new Set(["created", "result", "edit", "undo", "round", "note"]);
const clampInt = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
};
const nullableInt = (n: unknown, lo: number, hi: number) =>
  n === null || n === undefined || !Number.isFinite(Number(n)) ? null : clampInt(n, lo, hi, lo);

export function eventToHeaderRow(t: Tournament): EventRow {
  return {
    id: cloudIdFor("tournaments", t.id),
    client_id: t.id,
    name: (t.name || "Untitled event").slice(0, 120),
    format: FORMATS.has(t.format) ? t.format : "round-robin",
    entry_mode: t.entryMode === "rotating" ? "rotating" : "teams",
    team_size: t.teamSize === 1 ? 1 : 2,
    status: STATUSES.has(t.status) ? t.status : "setup",
    champion_team_id: t.championTeamId ? t.championTeamId.slice(0, 64) : null,
    config: t.config,
    players: t.players ?? [],
    teams: t.teams ?? [],
    created_at: new Date(t.createdAt || Date.now()).toISOString(),
  };
}

export function eventToMatchRows(t: Tournament): EventMatchRow[] {
  const parent = cloudIdFor("tournaments", t.id);
  return (t.matches ?? []).map((m) => ({
    id: cloudIdFor("tournament_matches", `${t.id}:${m.id}`),
    tournament_id: parent,
    client_id: m.id,
    bracket: BRACKETS.has(m.bracket) ? m.bracket : "rr",
    round: clampInt(m.round, 1, 999, 1),
    pool: m.pool ? m.pool.slice(0, 8) : null,
    slot_a: m.a,
    slot_b: m.b,
    team_a: m.teamA ?? null,
    team_b: m.teamB ?? null,
    score_a: nullableInt(m.scoreA, 0, 999),
    score_b: nullableInt(m.scoreB, 0, 999),
    winner: m.winner ?? null,
    court: nullableInt(m.court, 1, 64),
    label: m.label ? m.label.slice(0, 40) : null,
    played_in_app: Boolean(m.playedInApp),
    completed_at: m.completedAt ? new Date(m.completedAt).toISOString() : null,
  }));
}

/**
 * Only the log lines this device has not sent yet. The table has no update policy
 * at all, so re-sending is not "wasteful", it is rejected.
 */
export function unsentLogRows(t: Tournament): EventLogRow[] {
  const sent = logSentCount(t.id);
  const lines = t.log ?? [];
  const parent = cloudIdFor("tournaments", t.id);
  return lines.slice(sent).map((e, i) => ({
    id: cloudIdFor("event_log", `${t.id}:${sent + i}`),
    tournament_id: parent,
    kind: KINDS.has(e.kind) ? e.kind : "note",
    match_id: e.matchId ? cloudIdFor("tournament_matches", `${t.id}:${e.matchId}`) : null,
    text: (e.text || "").slice(0, 500),
    at: new Date(e.at || Date.now()).toISOString(),
  }));
}

export function logSentCount(localEventId: string): number {
  return read<Record<string, number>>(LOG_SENT_KEY, {})[localEventId] ?? 0;
}

export function setLogSentCount(localEventId: string, count: number) {
  const all = read<Record<string, number>>(LOG_SENT_KEY, {});
  // Only ever forwards: a device that re-reads an older blob must not re-send.
  if ((all[localEventId] ?? 0) >= count) return;
  write(LOG_SENT_KEY, { ...all, [localEventId]: count });
}

/* ──────────────────────────── reassembly ──────────────────────────── */

export function rowToEventMatch(r: EventMatchRow): TournamentMatch {
  const m: TournamentMatch = {
    id: r.client_id || r.id,
    bracket: (BRACKETS.has(r.bracket) ? r.bracket : "rr") as Bracket,
    round: r.round,
    a: r.slot_a,
    b: r.slot_b,
  };
  // Absent stays absent: an unplayed match with `scoreA: null` would render as a
  // 0-0 result rather than as "not played yet".
  if (r.pool) m.pool = r.pool;
  if (r.team_a) m.teamA = r.team_a;
  if (r.team_b) m.teamB = r.team_b;
  if (r.score_a !== null) m.scoreA = r.score_a;
  if (r.score_b !== null) m.scoreB = r.score_b;
  if (r.winner) m.winner = r.winner;
  if (r.court !== null) m.court = r.court;
  if (r.label) m.label = r.label;
  if (r.played_in_app) m.playedInApp = true;
  if (r.completed_at) m.completedAt = new Date(r.completed_at).getTime();
  return m;
}

export function rowToLogEntry(r: EventLogRow, matchIdByCloudId: Map<string, string>): EventLogEntry {
  const entry: EventLogEntry = {
    at: new Date(r.at).getTime(),
    kind: r.kind,
    text: r.text,
  };
  if (r.match_id) {
    const local = matchIdByCloudId.get(r.match_id);
    if (local) entry.matchId = local;
  }
  return entry;
}

/** Rebuild the blob the UI reads from the three tables. */
export function rowsToTournament(
  header: EventRow,
  matchRows: EventMatchRow[],
  logRows: EventLogRow[],
): Tournament {
  const matches = matchRows.map(rowToEventMatch);
  const byCloudId = new Map(matchRows.map((r) => [r.id, r.client_id || r.id]));
  const t: Tournament = {
    id: header.client_id || header.id,
    name: header.name,
    createdAt: new Date(header.created_at).getTime(),
    format: header.format as Format,
    entryMode: header.entry_mode as EntryMode,
    teamSize: header.team_size,
    players: header.players ?? [],
    teams: header.teams ?? [],
    matches,
    config: header.config,
    status: header.status as Tournament["status"],
  };
  if (header.champion_team_id) t.championTeamId = header.champion_team_id;
  if (logRows.length) {
    t.log = [...logRows]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((r) => rowToLogEntry(r, byCloudId));
  }
  return t;
}
