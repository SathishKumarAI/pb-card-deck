/**
 * Win streaks, computed from saved matches.
 *
 * Owns the arithmetic only - no rendering, no storage. `lib/shareImage.ts`
 * draws these numbers and `components/SharePanel.tsx` picks whose they are.
 *
 * A "streak" here is consecutive WINS in chronological order. The subtlety
 * worth knowing: match history is stored newest-first, and a streak read off
 * that order without reversing it is the streak from the wrong end of the day.
 */

import type { SavedMatch } from "./client-api";

export interface StreakStats {
  name: string;
  played: number;
  wins: number;
  losses: number;
  /** Consecutive wins up to and including the most recent match. */
  current: number;
  /** The longest run of wins anywhere in the history. */
  best: number;
  /** Most recent results first: true = won. Capped for display. */
  recent: boolean[];
  /** 0-100, rounded. */
  winRate: number;
  /** When the current streak started, or the last match if there is no streak. */
  since?: number;
}

/** Every name that appears in a match, in the order they last played. */
export function namesInHistory(matches: SavedMatch[]): string[] {
  const seen = new Map<string, number>();
  for (const m of matches) {
    for (const name of [m.team1_name, m.team2_name]) {
      if (!name?.trim()) continue;
      seen.set(name, Math.max(seen.get(name) ?? 0, m.created_at));
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/**
 * Streak stats for one name. `matches` may be in any order - it is sorted
 * oldest-first here, because that is the only order a streak means anything in.
 */
export function streakFor(name: string, matches: SavedMatch[], recentCap = 12): StreakStats {
  const mine = matches
    .filter((m) => m.team1_name === name || m.team2_name === name)
    .slice()
    .sort((a, b) => a.created_at - b.created_at);

  const results = mine.map((m) => ({
    won: (m.team1_name === name && m.winner === 1) || (m.team2_name === name && m.winner === 2),
    at: m.created_at,
  }));

  let best = 0;
  let run = 0;
  let current = 0;
  let since: number | undefined;

  for (const r of results) {
    if (r.won) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // The current streak is the tail of the list.
  for (let i = results.length - 1; i >= 0; i--) {
    if (!results[i].won) break;
    current += 1;
    since = results[i].at;
  }

  const wins = results.filter((r) => r.won).length;
  const played = results.length;

  return {
    name,
    played,
    wins,
    losses: played - wins,
    current,
    best,
    recent: results.slice(-recentCap).reverse().map((r) => r.won),
    winRate: played ? Math.round((wins / played) * 100) : 0,
    since: since ?? results[results.length - 1]?.at,
  };
}

/** Everyone in the history, best current streak first. */
export function allStreaks(matches: SavedMatch[], minPlayed = 1): StreakStats[] {
  return namesInHistory(matches)
    .map((name) => streakFor(name, matches))
    .filter((s) => s.played >= minPlayed)
    .sort((a, b) => b.current - a.current || b.best - a.best || b.winRate - a.winRate);
}

/** The line a share card leads with. */
export function streakHeadline(s: StreakStats): string {
  if (s.current >= 2) return `${s.current} wins in a row`;
  if (s.current === 1) return "Won the last one";
  if (s.best >= 2) return `Best run: ${s.best} in a row`;
  return `${s.wins} of ${s.played}`;
}
