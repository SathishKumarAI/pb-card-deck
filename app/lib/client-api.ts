import { GameSession } from "./game";
import { Card, CATEGORIES } from "./cards";
import type { Tournament } from "./tournament/types";

/*
 * Local-first store - everything lives in localStorage. No accounts, no server.
 * Export/import lets users back up or move their data between devices manually.
 */

const DECKS_KEY = "pb-custom-decks";
const MATCHES_KEY = "pb-match-history";
const FAVORITES_KEY = "pb-favorites";
const STATS_KEY = "pb-stats";
const EVENTS_KEY = "pb-tournaments";

export interface CustomDeck {
  id: string;
  name: string;
  description: string;
  cards: { name: string; effect: string; category: string }[];
  created_at: number;
}

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

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Custom decks ─── */
export function listDecks(): CustomDeck[] {
  return read<CustomDeck[]>(DECKS_KEY, []).sort((a, b) => b.created_at - a.created_at);
}
export function saveDeck(deck: { name: string; description: string; cards: CustomDeck["cards"] }): CustomDeck {
  const decks = read<CustomDeck[]>(DECKS_KEY, []);
  const created: CustomDeck = { id: uid(), created_at: Date.now(), ...deck };
  write(DECKS_KEY, [created, ...decks]);
  return created;
}
export function deleteDeck(id: string) {
  write(DECKS_KEY, read<CustomDeck[]>(DECKS_KEY, []).filter((d) => d.id !== id));
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
    duration_ms: Date.now() - g.startTime,
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
  lines.push(`Duration: ${Math.round((Date.now() - g.startTime) / 60000)} min`);
  return lines.join("\n");
}
export function clearMatches() {
  write(MATCHES_KEY, []);
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

/* ─── Tournaments ───
   An event is one JSON blob - teams, schedule and every result - so saving is
   a whole-object write. A 50-player event is around 40 KB, well inside the
   localStorage budget, and it keeps the engine free of storage concerns. */
export function listTournaments(): Tournament[] {
  return read<Tournament[]>(EVENTS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function getTournament(id: string): Tournament | null {
  return listTournaments().find((t) => t.id === id) ?? null;
}
export function saveTournament(t: Tournament) {
  const all = read<Tournament[]>(EVENTS_KEY, []).filter((x) => x.id !== t.id);
  write(EVENTS_KEY, [t, ...all].slice(0, 50));
}
export function deleteTournament(id: string) {
  write(EVENTS_KEY, read<Tournament[]>(EVENTS_KEY, []).filter((t) => t.id !== id));
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

/* ─── Lightweight event stats for achievements (backlog F121) ─── */
export function getStats(): Record<string, number> {
  return read<Record<string, number>>(STATS_KEY, {});
}
export function bumpStat(key: string, n = 1) {
  const s = read<Record<string, number>>(STATS_KEY, {});
  s[key] = (s[key] || 0) + n;
  write(STATS_KEY, s);
}

/* ─── Deck share codes (backlog F042 / F043) ─── */
// Encode a deck to a compact URL-safe base64 code, importable on another device.
export function encodeDeck(d: { name: string; description: string; cards: CustomDeck["cards"] }): string {
  const payload = { n: d.name, d: d.description, c: d.cards.map((c) => ({ n: c.name, e: c.effect, k: c.category })) };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDeck(code: string): { name: string; description: string; cards: CustomDeck["cards"] } | null {
  try {
    const b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(json);
    if (!p || !Array.isArray(p.c)) return null;
    const cats = new Set<string>(CATEGORIES);
    const cards = p.c
      .filter((x: { n?: string; e?: string }) => x && x.n && x.e)
      .map((x: { n: string; e: string; k?: string }) => ({
        name: String(x.n).slice(0, 80),
        effect: String(x.e).slice(0, 300),
        category: cats.has(String(x.k)) ? String(x.k) : CATEGORIES[0],
      }));
    if (cards.length === 0) return null;
    return {
      name: String(p.n || "Imported deck").slice(0, 60),
      description: String(p.d || "").slice(0, 120),
      cards,
    };
  } catch {
    return null;
  }
}

// Decode + save a shared deck. Returns the saved deck, or null if the code is bad.
export function importDeckCode(code: string): CustomDeck | null {
  const d = decodeDeck(code);
  if (!d) return null;
  return saveDeck(d);
}

/* Turn a custom deck's cards into playable Card objects (negative ids avoid clashing). */
// Wipe every local trace of the user's data (backlog F342). Local-first means
// there's nothing on a server to delete - clearing these keys is a full erase.
export function clearAllData() {
  try {
    [DECKS_KEY, MATCHES_KEY, FAVORITES_KEY, STATS_KEY, "pickleball-shuffle-game", "pb-beginner-intro-seen"].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch {}
}

export function deckToCards(deck: CustomDeck): Card[] {
  return deck.cards.map((c, i) => ({
    id: -(i + 1),
    category: c.category || "Wacky / Chaos",
    name: c.name,
    effect: c.effect,
    vibe: "",
  }));
}
