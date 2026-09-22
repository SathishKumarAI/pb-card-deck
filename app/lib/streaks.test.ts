import { describe, it, expect } from "vitest";
import { streakFor, allStreaks, namesInHistory, streakHeadline } from "./streaks";
import type { SavedMatch } from "./client-api";

/** A match, newest-first as localStorage actually stores them. */
function m(day: number, a: string, b: string, winner: 1 | 2): SavedMatch {
  return {
    id: `${day}`,
    mode: "chaos",
    team1_name: a,
    team2_name: b,
    score_team1: winner === 1 ? 11 : 6,
    score_team2: winner === 2 ? 11 : 6,
    winner,
    game_number: 1,
    duration_ms: 600000,
    results: [],
    created_at: Date.UTC(2026, 0, day),
  };
}

describe("streaks", () => {
  it("counts the current streak from the most recent match backwards", () => {
    // Stored newest-first: Ana won days 5, 4, 3, lost day 2, won day 1.
    const history = [
      m(5, "Ana", "Ben", 1),
      m(4, "Ana", "Ben", 1),
      m(3, "Ben", "Ana", 2),
      m(2, "Ana", "Ben", 2),
      m(1, "Ana", "Ben", 1),
    ];
    const s = streakFor("Ana", history);
    expect(s.current).toBe(3);
    expect(s.played).toBe(5);
    expect(s.wins).toBe(4);
    expect(s.winRate).toBe(80);
  });

  it("reads the streak from the right end of the history", () => {
    // Newest-first input where the OLD end has the long run: current is 1.
    const history = [
      m(4, "Ana", "Ben", 1), // most recent: won
      m(3, "Ana", "Ben", 2), // lost
      m(2, "Ana", "Ben", 1),
      m(1, "Ana", "Ben", 1),
    ];
    const s = streakFor("Ana", history);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it("keeps the best run even when the current one is zero", () => {
    const history = [
      m(4, "Ana", "Ben", 2), // lost the last one
      m(3, "Ana", "Ben", 1),
      m(2, "Ana", "Ben", 1),
      m(1, "Ana", "Ben", 1),
    ];
    const s = streakFor("Ana", history);
    expect(s.current).toBe(0);
    expect(s.best).toBe(3);
  });

  it("lists recent results newest-first for the dot row", () => {
    const history = [
      m(3, "Ana", "Ben", 1), // W
      m(2, "Ana", "Ben", 2), // L
      m(1, "Ana", "Ben", 1), // W
    ];
    expect(streakFor("Ana", history).recent).toEqual([true, false, true]);
  });

  it("caps the dot row", () => {
    const history = Array.from({ length: 30 }, (_, i) => m(i + 1, "Ana", "Ben", 1));
    expect(streakFor("Ana", history, 12).recent).toHaveLength(12);
  });

  it("counts a name on either side of the net", () => {
    const history = [m(2, "Ben", "Ana", 2), m(1, "Ana", "Ben", 1)];
    const s = streakFor("Ana", history);
    expect(s.wins).toBe(2);
    expect(s.current).toBe(2);
  });

  it("handles someone with no matches", () => {
    const s = streakFor("Nobody", [m(1, "Ana", "Ben", 1)]);
    expect(s).toMatchObject({ played: 0, wins: 0, current: 0, best: 0, winRate: 0 });
    expect(s.recent).toEqual([]);
  });

  it("orders everyone by current streak, then best", () => {
    const history = [
      m(6, "Ana", "Ben", 1),
      m(5, "Ana", "Ben", 1),
      m(4, "Cara", "Dev", 1),
      m(3, "Cara", "Dev", 2),
      m(2, "Cara", "Dev", 1),
      m(1, "Cara", "Dev", 1),
    ];
    const table = allStreaks(history);
    expect(table[0].name).toBe("Ana");
    expect(table[0].current).toBe(2);
    expect(table.find((s) => s.name === "Ben")!.current).toBe(0);
  });

  it("lists names by who played most recently", () => {
    const history = [m(2, "Cara", "Dev", 1), m(1, "Ana", "Ben", 1)];
    expect(namesInHistory(history).slice(0, 2)).toEqual(["Cara", "Dev"]);
  });

  it("writes a headline that suits the streak", () => {
    const base = { name: "Ana", played: 5, wins: 4, losses: 1, best: 3, recent: [], winRate: 80 };
    expect(streakHeadline({ ...base, current: 3 })).toBe("3 wins in a row");
    expect(streakHeadline({ ...base, current: 1 })).toBe("Won the last one");
    expect(streakHeadline({ ...base, current: 0 })).toBe("Best run: 3 in a row");
    expect(streakHeadline({ ...base, current: 0, best: 1 })).toBe("4 of 5");
  });
});
