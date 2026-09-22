/**
 * Round-robin scheduling by the circle method.
 *
 * Owns: given a list of team ids, who plays whom in which round, such that
 * every pair meets exactly once and nobody plays twice in the same round.
 * Owns nothing about courts, scores or standings.
 */

import type { TournamentMatch } from "./types";

/**
 * Pair everyone with everyone across n-1 rounds (n even) or n rounds (n odd,
 * where each round one team sits out).
 *
 * The circle method: hold the first team still and rotate the rest clockwise
 * one position each round. An odd count gets a phantom "bye" team, and whoever
 * is drawn against the phantom sits that round out.
 */
export function roundRobinPairs(teamIds: string[]): [string, string][][] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  const BYE = "__bye__";
  if (ids.length % 2 === 1) ids.push(BYE);

  const n = ids.length;
  const rounds: [string, string][][] = [];
  // Rotate a working copy; index 0 stays fixed.
  let circle = ids.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    const ordered = [ids[0], ...circle];
    for (let i = 0; i < n / 2; i++) {
      const home = ordered[i];
      const away = ordered[n - 1 - i];
      if (home === BYE || away === BYE) continue;
      // Alternate which side is listed first so no team is always "team A".
      pairs.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    circle = [circle[circle.length - 1], ...circle.slice(0, -1)];
  }

  return rounds;
}

/** Round-robin matches for one group, ready to drop into a tournament. */
export function roundRobinMatches(
  teamIds: string[],
  opts: { idPrefix: string; bracket?: "rr" | "pool"; pool?: string; roundOffset?: number } = { idPrefix: "rr" },
): TournamentMatch[] {
  const { idPrefix, bracket = "rr", pool, roundOffset = 0 } = opts;
  const out: TournamentMatch[] = [];

  roundRobinPairs(teamIds).forEach((pairs, roundIdx) => {
    pairs.forEach(([a, b], i) => {
      out.push({
        id: `${idPrefix}-r${roundIdx + 1}-m${i + 1}`,
        bracket,
        pool,
        round: roundIdx + 1 + roundOffset,
        a: { from: "team", teamId: a },
        b: { from: "team", teamId: b },
        teamA: a,
        teamB: b,
      });
    });
  });

  return out;
}

/** How many rounds a round robin of this size takes. */
export function roundRobinRoundCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}
