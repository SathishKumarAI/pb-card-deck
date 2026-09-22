import { describe, it, expect } from "vitest";
import { roundRobinPairs, roundRobinMatches, roundRobinRoundCount } from "./roundRobin";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

describe("round robin", () => {
  it("has every pair meet exactly once, for even and odd counts", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      const rounds = roundRobinPairs(ids(n));
      const seen = new Map<string, number>();
      for (const round of rounds) {
        for (const [a, b] of round) seen.set(pairKey(a, b), (seen.get(pairKey(a, b)) ?? 0) + 1);
      }
      const expectedPairs = (n * (n - 1)) / 2;
      expect(seen.size, `pair count for ${n}`).toBe(expectedPairs);
      expect([...seen.values()].every((c) => c === 1), `no repeats for ${n}`).toBe(true);
    }
  });

  it("never schedules a team twice in the same round", () => {
    for (const n of [4, 5, 6, 7, 11]) {
      for (const round of roundRobinPairs(ids(n))) {
        const players = round.flat();
        expect(new Set(players).size, `round has unique teams for ${n}`).toBe(players.length);
      }
    }
  });

  it("sits exactly one team out per round when the count is odd", () => {
    const n = 7;
    const rounds = roundRobinPairs(ids(n));
    expect(rounds).toHaveLength(n); // odd -> n rounds
    for (const round of rounds) {
      expect(round).toHaveLength((n - 1) / 2);
    }
    // and across the event everybody sits out exactly once
    const sitOuts = rounds.map((round) => {
      const playing = new Set(round.flat());
      return ids(n).find((id) => !playing.has(id));
    });
    expect(new Set(sitOuts).size).toBe(n);
  });

  it("reports the round count a schedule will take", () => {
    expect(roundRobinRoundCount(6)).toBe(5);
    expect(roundRobinRoundCount(7)).toBe(7);
    expect(roundRobinRoundCount(1)).toBe(0);
  });

  it("builds matches with both teams resolved up front", () => {
    const matches = roundRobinMatches(ids(4), { idPrefix: "pA", bracket: "pool", pool: "A" });
    expect(matches).toHaveLength(6);
    expect(matches.every((m) => m.teamA && m.teamB)).toBe(true);
    expect(matches.every((m) => m.pool === "A" && m.bracket === "pool")).toBe(true);
    expect(new Set(matches.map((m) => m.id)).size).toBe(matches.length);
  });

  it("offsets rounds so a pool can follow another phase", () => {
    const matches = roundRobinMatches(ids(4), { idPrefix: "x", roundOffset: 10 });
    expect(Math.min(...matches.map((m) => m.round))).toBe(11);
  });

  it("does not always put the same team first", () => {
    // Every team should appear on side A at least once across a 6-team event;
    // a naive circle method pins team 1 to side A forever.
    const rounds = roundRobinPairs(ids(6));
    const sideA = new Set(rounds.flat().map(([a]) => a));
    expect(sideA.size).toBeGreaterThan(3);
  });
});
