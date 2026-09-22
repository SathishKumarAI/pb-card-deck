export interface ScoreEvent {
  team: 1 | 2;
  type: "score" | "sideout" | "adjust" | "undo" | "reset";
  scoreBefore: { team1: number; team2: number };
  scoreAfter: { team1: number; team2: number };
  /* Who was serving before this event, and which server they were on. Undo
     without this restores the score but leaves the serve where it ended up,
     which silently corrupts a side-out game - and a side-out itself could not
     be undone at all, because it changed no score and logged no event. Older
     saved games have no serve fields; undoLast falls back to the current
     serve for those. */
  serveBefore?: { team: 1 | 2; server: 1 | 2 };
  timestamp: number;
}

/** The serve half of a session, snapshotted for the undo stack. */
function serveOf(game: GameSession): { team: 1 | 2; server: 1 | 2 } {
  return { team: game.servingTeam, server: game.serverNumber };
}

export type GameType = "singles" | "doubles" | "mixed-doubles";

export interface GameConfig {
  pointsToWin: number;
  winByTwo: boolean;
  sideOutScoring: boolean;
  confirmScore: boolean;
  scoreLocked: boolean;
  soundEnabled: boolean;
  gameType: GameType;
  /* Match length: 1 = single game, 3 = best of 3, 5 = best of 5. */
  bestOf: number;
  /* Card text style: false = concise, true = commentator voice. */
  commentaryMode: boolean;
  /* Coach / umpire "Track a match" mode: proper server rotation + a match log.
     Optional so existing saved games (no flag) keep the casual behaviour. */
  officialMode?: boolean;
  /* In official mode, whether twist cards can still be drawn (off by default). */
  cardsEnabled?: boolean;
  /* Optional event / round label recorded with the match. */
  eventLabel?: string;
  /* Speak the score aloud after each point (Web Speech API). Off by default. */
  announceScore?: boolean;
}

/* One entry in an official match's log: a timeout, a manual fault, or the
   halfway side-switch, stamped with the score + time it happened. */
export interface MatchLogEntry {
  type: "timeout" | "fault" | "switch";
  team?: 1 | 2;
  score: { team1: number; team2: number };
  gameNumber: number;
  timestamp: number;
}

import { Card } from "./cards";

export interface GameSession {
  id: string;
  mode: string;
  /* Custom-deck context (only set when playing a user deck), so resume restores it. */
  customName?: string | null;
  customCards?: Card[] | null;
  score: { team1: number; team2: number };
  servingTeam: 1 | 2;
  serverNumber: 1 | 2;
  history: ScoreEvent[];
  gameNumber: number;
  gamesWon: { team1: number; team2: number };
  gameResults: { team1: number; team2: number }[];
  winner: 1 | 2 | null;
  startTime: number;
  /* Pause: timestamp the current pause began (null = running), and total ms
     accumulated across past pauses. Together they freeze the elapsed clock. */
  pausedAt?: number | null;
  pausedMs?: number;
  playerNames: { team1: string; team2: string };
  config: GameConfig;
  cardIds: number[];
  drawnCardIds: number[];
  favoriteCardIds: number[];
  skippedCardIds: number[];
  /* Official-mode audit trail (timeouts / faults / side-switches). */
  matchLog?: MatchLogEntry[];
  /* Set when this game IS a tournament match, so the final score can be
     written back to the event that scheduled it. Team 1 is always the
     match's team A. */
  tournamentRef?: { tournamentId: string; matchId: string };
}

export const DEFAULT_CONFIG: GameConfig = {
  pointsToWin: 11,
  winByTwo: true,
  sideOutScoring: true,
  confirmScore: false,
  scoreLocked: false,
  soundEnabled: true,
  gameType: "doubles",
  bestOf: 3,
  commentaryMode: false,
  officialMode: false,
  cardsEnabled: true,
  eventLabel: "",
  announceScore: false,
};

// Plain-language description of what changed between two game states, for the
// on-screen "consequence" banner and the optional voice announce. Pure so it's
// unit-testable. Returns "" when nothing meaningful changed.
export function outcomeMessage(prev: GameSession, next: GameSession): string {
  const name = (t: 1 | 2) => (t === 1 ? next.playerNames.team1 : next.playerNames.team2);
  if (next.winner && next.winner !== prev.winner) {
    return `${name(next.winner)} wins the game!`;
  }
  // A point was scored (one team's score went up).
  if (next.score.team1 > prev.score.team1) return `Point ${name(1)} — ${next.score.team1}-${next.score.team2}`;
  if (next.score.team2 > prev.score.team2) return `Point ${name(2)} — ${next.score.team1}-${next.score.team2}`;
  // Serve passed to the other team.
  if (next.servingTeam !== prev.servingTeam) {
    const label = next.config.gameType !== "singles" ? ", server 1" : "";
    return `Side out — ${name(next.servingTeam)} serves${label}`;
  }
  // Same team, advanced from 1st to 2nd server (doubles).
  if (next.serverNumber !== prev.serverNumber) {
    return `${name(next.servingTeam)} — 2nd server serves`;
  }
  return "";
}

export function createGame(
  mode: string,
  names?: { team1: string; team2: string },
  configOverrides?: Partial<GameConfig>,
): GameSession {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mode,
    score: { team1: 0, team2: 0 },
    servingTeam: 1,
    serverNumber: 1,
    history: [],
    gameNumber: 1,
    gamesWon: { team1: 0, team2: 0 },
    gameResults: [],
    winner: null,
    startTime: Date.now(),
    pausedAt: null,
    pausedMs: 0,
    playerNames: names || { team1: "Team 1", team2: "Team 2" },
    config: { ...DEFAULT_CONFIG, ...configOverrides },
    cardIds: [],
    drawnCardIds: [],
    favoriteCardIds: [],
    skippedCardIds: [],
    matchLog: [],
  };
}

export function addScore(game: GameSession, team: 1 | 2): GameSession {
  if (game.config.scoreLocked || game.winner) return game;

  // The receiving side winning a rally scores nothing - it wins the serve. That
  // is the most common tap in a side-out game, so it goes on the undo stack
  // like any other action.
  if (game.config.sideOutScoring && team !== game.servingTeam) {
    const after = sideOut(game);
    const event: ScoreEvent = {
      team,
      type: "sideout",
      scoreBefore: { ...game.score },
      scoreAfter: { ...game.score },
      serveBefore: serveOf(game),
      timestamp: Date.now(),
    };
    return { ...after, history: [...game.history, event] };
  }

  const key = team === 1 ? "team1" : "team2";
  const scoreBefore = { ...game.score };
  const scoreAfter = { ...game.score, [key]: game.score[key] + 1 };

  const event: ScoreEvent = {
    team,
    type: "score",
    scoreBefore,
    scoreAfter,
    serveBefore: serveOf(game),
    timestamp: Date.now(),
  };

  const winner = checkWin(scoreAfter, game.config);

  return {
    ...game,
    score: scoreAfter,
    history: [...game.history, event],
    winner,
  };
}

// Manual score correction (backlog F065): nudge a team's score by delta,
// clamped at 0, recomputing the winner. Logged so it can be undone.
export function adjustScore(game: GameSession, team: 1 | 2, delta: number): GameSession {
  const key = team === 1 ? "team1" : "team2";
  const next = Math.max(0, game.score[key] + delta);
  if (next === game.score[key]) return game;
  const scoreBefore = { ...game.score };
  const scoreAfter = { ...game.score, [key]: next };
  const event: ScoreEvent = {
    team,
    type: "adjust",
    scoreBefore,
    scoreAfter,
    serveBefore: serveOf(game),
    timestamp: Date.now(),
  };
  return { ...game, score: scoreAfter, history: [...game.history, event], winner: checkWin(scoreAfter, game.config) };
}

export function sideOut(game: GameSession): GameSession {
  // Official doubles uses the real two-server rotation: the first server's
  // fault passes to the second server on the SAME team; the second server's
  // fault passes the serve to the other team (back to server 1). Casual play
  // (no officialMode) and singles just pass the serve straight over.
  const officialDoubles = !!game.config.officialMode && game.config.gameType !== "singles";
  if (officialDoubles && game.serverNumber === 1) {
    return { ...game, serverNumber: 2 };
  }
  const newServingTeam: 1 | 2 = game.servingTeam === 1 ? 2 : 1;
  return { ...game, servingTeam: newServingTeam, serverNumber: 1 };
}

// Human label for who's serving, e.g. "Server 2" (doubles only). Empty in
// singles, where there's just one server per side.
export function serverLabel(game: GameSession): string {
  if (game.config.gameType === "singles") return "";
  return `Server ${game.serverNumber}`;
}

// Append a timeout/fault/side-switch to the official match log (pure).
function logEntry(game: GameSession, type: MatchLogEntry["type"], team?: 1 | 2): GameSession {
  const entry: MatchLogEntry = {
    type,
    team,
    score: { ...game.score },
    gameNumber: game.gameNumber,
    timestamp: Date.now(),
  };
  return { ...game, matchLog: [...(game.matchLog ?? []), entry] };
}

export function recordTimeout(game: GameSession, team: 1 | 2): GameSession {
  return logEntry(game, "timeout", team);
}

export function recordFault(game: GameSession, team: 1 | 2): GameSession {
  return logEntry(game, "fault", team);
}

// Count of a given log type, optionally for one team (for the in-game chips).
export function logCount(game: GameSession, type: MatchLogEntry["type"], team?: 1 | 2): number {
  return (game.matchLog ?? []).filter((e) => e.type === type && (team ? e.team === team : true)).length;
}

export function undoLast(game: GameSession): GameSession {
  if (game.history.length === 0) return game;

  const lastEvent = game.history[game.history.length - 1];
  const serve = lastEvent.serveBefore;

  return {
    ...game,
    score: lastEvent.scoreBefore,
    servingTeam: serve?.team ?? game.servingTeam,
    serverNumber: serve?.server ?? game.serverNumber,
    history: game.history.slice(0, -1),
    winner: null,
  };
}

/** What the last undoable action was, for telling the user what they took back. */
export function lastActionLabel(game: GameSession, names: { team1: string; team2: string }): string | null {
  const last = game.history[game.history.length - 1];
  if (!last) return null;
  const who = last.team === 1 ? names.team1 : names.team2;
  switch (last.type) {
    case "score": return `point to ${who}`;
    case "sideout": return "side out";
    case "adjust": return `correction to ${who}`;
    case "reset": return "reset";
    default: return "last action";
  }
}

export function resetScore(game: GameSession): GameSession {
  // Clean slate for the current game, but NOT an unrecoverable one: the reset
  // itself goes on the undo stack carrying the score and serve it wiped, so a
  // mis-tapped Reset is one Undo away. (Saved Match history in localStorage is
  // separate and is NOT touched here.)
  const event: ScoreEvent = {
    team: game.servingTeam,
    type: "reset",
    scoreBefore: { ...game.score },
    scoreAfter: { team1: 0, team2: 0 },
    serveBefore: serveOf(game),
    timestamp: Date.now(),
  };

  return {
    ...game,
    score: { team1: 0, team2: 0 },
    servingTeam: 1,
    serverNumber: 1,
    history: [event],
    winner: null,
  };
}

export function startNewGame(game: GameSession): GameSession {
  const results = [...game.gameResults, { ...game.score }];
  const gamesWon = { ...game.gamesWon };
  if (game.winner === 1) gamesWon.team1++;
  if (game.winner === 2) gamesWon.team2++;

  return {
    ...game,
    score: { team1: 0, team2: 0 },
    servingTeam: game.servingTeam === 1 ? 2 : 1,
    serverNumber: 1,
    history: [],
    gameNumber: game.gameNumber + 1,
    gamesWon,
    gameResults: results,
    winner: null,
    startTime: Date.now(),
    pausedAt: null,
    pausedMs: 0,
  };
}

// Games a team must win to take the match (best-of-N → ceil(N/2)).
export function gamesToWinMatch(config: GameConfig): number {
  return Math.ceil((config.bestOf ?? 3) / 2);
}

// Games won INCLUDING the just-finished game (gamesWon only updates on the next
// game, so the live match tally during the win screen must add the current win).
export function seriesTally(game: GameSession): { team1: number; team2: number } {
  const won = { ...game.gamesWon };
  if (game.winner === 1) won.team1++;
  if (game.winner === 2) won.team2++;
  return won;
}

// The match (series) winner, or null if the series isn't decided yet.
export function matchWinner(game: GameSession): 1 | 2 | null {
  if (!game.winner) return null;
  const won = seriesTally(game);
  const need = gamesToWinMatch(game.config);
  if (won.team1 >= need) return 1;
  if (won.team2 >= need) return 2;
  return null;
}

// Start a brand-new match: fresh series, but keep the same teams, deck mode,
// and settings the players already chose.
export function newMatch(game: GameSession): GameSession {
  return {
    ...createGame(game.mode, game.playerNames),
    config: game.config,
    customName: game.customName,
    customCards: game.customCards,
  };
}

// ── Pause: freeze the elapsed clock and block play until resumed ──
export function isPaused(game: GameSession): boolean {
  return game.pausedAt != null;
}

export function pauseGame(game: GameSession, now: number): GameSession {
  if (game.pausedAt) return game;
  return { ...game, pausedAt: now };
}

export function resumePlay(game: GameSession, now: number): GameSession {
  if (!game.pausedAt) return game;
  return { ...game, pausedAt: null, pausedMs: (game.pausedMs ?? 0) + (now - game.pausedAt) };
}

// Live elapsed ms with all paused time removed (back-compat: missing fields = 0).
export function elapsedMs(game: GameSession, now: number): number {
  const paused = (game.pausedMs ?? 0) + (game.pausedAt ? now - game.pausedAt : 0);
  return Math.max(0, now - game.startTime - paused);
}

export function checkWin(score: { team1: number; team2: number }, config: GameConfig): 1 | 2 | null {
  const { pointsToWin, winByTwo } = config;
  if (score.team1 >= pointsToWin) {
    if (!winByTwo || score.team1 - score.team2 >= 2) return 1;
  }
  if (score.team2 >= pointsToWin) {
    if (!winByTwo || score.team2 - score.team1 >= 2) return 2;
  }
  return null;
}

// Is a team one point from winning the game (or the whole match)? Drives the
// "Game point / Match point" banner (backlog F077). Returns null otherwise.
export function pointStatus(game: GameSession): { team: 1 | 2; match: boolean } | null {
  if (game.winner) return null;
  for (const team of [1, 2] as const) {
    const key = team === 1 ? "team1" : "team2";
    const probe = { ...game.score, [key]: game.score[key] + 1 };
    if (checkWin(probe, game.config) === team) {
      const wonAfter = (team === 1 ? game.gamesWon.team1 : game.gamesWon.team2) + 1;
      return { team, match: wonAfter >= gamesToWinMatch(game.config) };
    }
  }
  return null;
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STORAGE_KEY = "pickleball-shuffle-game"; // legacy single-game key (migrated)
const GAMES_KEY = "pickleball-shuffle-games"; // map of id -> GameSession (F085)
const MAX_SAVED = 8;

function readGames(): Record<string, GameSession> {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (raw) return JSON.parse(raw);
    // One-time migration from the old single-game key.
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const g = JSON.parse(legacy) as GameSession;
      return { [g.id]: g };
    }
  } catch {}
  return {};
}

function writeGames(map: Record<string, GameSession>) {
  // Keep only the most recent few so storage can't grow without bound.
  const trimmed = Object.values(map)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, MAX_SAVED);
  const out: Record<string, GameSession> = {};
  for (const g of trimmed) out[g.id] = g;
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(out));
  } catch {}
}

// Save (or update) one game in the keyed store. Mirrors to the legacy key so an
// older build still finds the most recent game.
export function saveGame(game: GameSession) {
  const map = readGames();
  map[game.id] = game;
  writeGames(map);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {}
}

// All unfinished games, most recently started first (F085).
export function listSavedGames(): GameSession[] {
  return Object.values(readGames())
    .filter((g) => g && !g.winner)
    .sort((a, b) => b.startTime - a.startTime);
}

// Back-compat: the most recent unfinished game.
export function loadGame(): GameSession | null {
  return listSavedGames()[0] ?? null;
}

// Remove one saved game by id, or all when no id is given.
export function clearSavedGame(id?: string) {
  try {
    if (!id) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GAMES_KEY);
      return;
    }
    const map = readGames();
    delete map[id];
    writeGames(map);
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      try {
        if ((JSON.parse(legacy) as GameSession).id === id) localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  } catch {}
}
