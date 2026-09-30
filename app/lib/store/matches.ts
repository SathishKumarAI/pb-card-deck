/**
 * Match history: what a finished match is, how it is saved, and the records and
 * exports computed from it (match sheet, CSV, lifetime per-name records).
 *
 * This file owns the saved-match shape and its storage. Scoring rules live in
 * `lib/game.ts`; streak maths lives in `lib/streaks.ts`.
 */

import { GameSession, elapsedMs } from "../game";
import { MATCHES_KEY, read, write, uid } from "./keys";
import { enqueue } from "../sync/outbox";

export interface SavedMatch {
  id: string;
  mode: string;
  team1_name: string;
  team2_name: string;
  score_team1: number;
  score_team2: number;
  winner: number | null;
  game_number: number;
  duration_ms: number;
  results: { team1: number; team2: number }[];
  created_at: number;
  /* Coach / umpire "Track a match" extras (optional; absent for casual play). */
  official?: boolean;
  event_label?: string;
  game_type?: string;
  timeouts?: { team1: number; team2: number };
  faults?: { team1: number; team2: number };
}

/* ─── Match history ─── */
export function listMatches(): SavedMatch[] {
  return read<SavedMatch[]>(MATCHES_KEY, []).sort((a, b) => b.created_at - a.created_at);
}
export function addMatch(g: GameSession) {
  const matches = read<SavedMatch[]>(MATCHES_KEY, []);
  const log = g.matchLog ?? [];
  const countBy = (type: "timeout" | "fault") => ({
    team1: log.filter((e) => e.type === type && e.team === 1).length,
    team2: log.filter((e) => e.type === type && e.team === 2).length,
  });
  const match: SavedMatch = {
    id: uid(),
    mode: g.mode,
    team1_name: g.playerNames.team1,
    team2_name: g.playerNames.team2,
    score_team1: g.score.team1,
    score_team2: g.score.team2,
    winner: g.winner,
    game_number: g.gameNumber,
    // Played time, not wall clock: a game paused for the length of a coffee
    // break used to record the break as play.
    duration_ms: elapsedMs(g, Date.now()),
    results: g.gameResults,
    created_at: Date.now(),
    ...(g.config.officialMode
      ? {
          official: true,
          event_label: g.config.eventLabel || undefined,
          game_type: g.config.gameType,
          timeouts: countBy("timeout"),
          faults: countBy("fault"),
        }
      : {}),
  };
  write(MATCHES_KEY, [match, ...matches].slice(0, 200));
  enqueue("matches", match.id);
}

// A single-match "match sheet" as plain text - the shareable proof a coach or
// umpire keeps (backlog: coach/umpire mode). Works off the live GameSession so
// it can be offered the moment a match ends.
export function matchSheet(g: GameSession): string {
  const won = g.gamesWon.team1 + (g.winner === 1 ? 1 : 0);
  const lost = g.gamesWon.team2 + (g.winner === 2 ? 1 : 0);
  const winnerName =
    g.winner === 1 ? g.playerNames.team1 : g.winner === 2 ? g.playerNames.team2 : "(unfinished)";
  const games = [...g.gameResults];
  if (g.winner) games.push({ ...g.score });
  const lines: string[] = [];
  lines.push("PICKLEBALL MATCH SHEET");
  if (g.config.eventLabel) lines.push(`Event: ${g.config.eventLabel}`);
  lines.push(`Format: ${g.config.gameType}${g.config.officialMode ? " (official)" : ""}`);
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(`${g.playerNames.team1}  vs  ${g.playerNames.team2}`);
  lines.push(`Games: ${won} - ${lost}   Winner: ${winnerName}`);
  lines.push("");
  lines.push("Game-by-game:");
  games.forEach((r, i) => lines.push(`  Game ${i + 1}:  ${r.team1} - ${r.team2}`));
  const log = g.matchLog ?? [];
  const to = { team1: log.filter((e) => e.type === "timeout" && e.team === 1).length, team2: log.filter((e) => e.type === "timeout" && e.team === 2).length };
  const fa = { team1: log.filter((e) => e.type === "fault" && e.team === 1).length, team2: log.filter((e) => e.type === "fault" && e.team === 2).length };
  if (to.team1 || to.team2 || fa.team1 || fa.team2) {
    lines.push("");
    lines.push(`Timeouts:  ${g.playerNames.team1} ${to.team1}, ${g.playerNames.team2} ${to.team2}`);
    lines.push(`Faults:    ${g.playerNames.team1} ${fa.team1}, ${g.playerNames.team2} ${fa.team2}`);
  }
  lines.push("");
  lines.push(`Duration: ${Math.round(elapsedMs(g, Date.now()) / 60000)} min`);
  return lines.join("\n");
}
export function clearMatches() {
  // Every match is individually tombstoned, or clearing history on one device would
  // leave it intact on the other and then sync straight back.
  for (const m of read<SavedMatch[]>(MATCHES_KEY, [])) enqueue("matches", m.id, "delete");
  write(MATCHES_KEY, []);
}

/* ─── applied BY the sync engine, never by the UI (see store/decks.ts) ─── */

export function applyRemoteMatch(match: SavedMatch) {
  const rest = read<SavedMatch[]>(MATCHES_KEY, []).filter((m) => m.id !== match.id);
  write(MATCHES_KEY, [match, ...rest].sort((a, b) => b.created_at - a.created_at).slice(0, 200));
}

export function dropMatchLocally(id: string) {
  write(MATCHES_KEY, read<SavedMatch[]>(MATCHES_KEY, []).filter((m) => m.id !== id));
}

// Lifetime win/loss per team name, most wins first (backlog F111). No accounts,
// so records are keyed by the names players type in.
export function playerRecords(): { name: string; wins: number; played: number }[] {
  const map = new Map<string, { wins: number; played: number }>();
  for (const g of listMatches()) {
    for (const [name, won] of [
      [g.team1_name, g.winner === 1],
      [g.team2_name, g.winner === 2],
    ] as const) {
      if (!name?.trim()) continue;
      const r = map.get(name) ?? { wins: 0, played: 0 };
      r.played += 1;
      if (won) r.wins += 1;
      map.set(name, r);
    }
  }
  return [...map.entries()]
    .map(([name, r]) => ({ name, ...r }))
    .sort((a, b) => b.wins - a.wins || b.played - a.played);
}

// Match history as CSV for spreadsheets/backup (backlog F116).
export function matchesToCsv(): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["date", "mode", "team1", "score1", "team2", "score2", "winner", "games", "minutes"];
  const rows = listMatches().map((g) => [
    new Date(g.created_at).toISOString(),
    g.mode,
    g.team1_name,
    g.score_team1,
    g.team2_name,
    g.score_team2,
    g.winner === 1 ? g.team1_name : g.winner === 2 ? g.team2_name : "",
    g.results.length || g.game_number,
    Math.round(g.duration_ms / 60000),
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
