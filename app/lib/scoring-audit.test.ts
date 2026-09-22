/**
 * The scoring rules audited against the rulebook, one defect per test.
 *
 * Each test here failed when it was written. They are kept separate from
 * `game.test.ts` so the audit's findings stay readable as a list: what the
 * engine got wrong, stated as the behaviour a player would see.
 */

import { describe, it, expect } from "vitest";
import {
  createGame, addScore, adjustScore, resetScore, startNewGame, pointStatus,
  initialServerNumber, DEFAULT_CONFIG, type GameConfig, type GameSession,
} from "./game";

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({ ...DEFAULT_CONFIG, ...over });

/** An official doubles game - the only mode that tracks two servers. */
function official(over: Partial<GameConfig> = {}): GameSession {
  return createGame("test", undefined, cfg({ officialMode: true, gameType: "doubles", ...over }));
}

describe("reset puts the game back to how it STARTED, not to team 1 server 1", () => {
  it("keeps the starting-second-server rule after a reset", () => {
    const g = official();
    expect(g.serverNumber).toBe(2); // USA Pickleball 4.B.7

    const played = addScore(addScore(g, 1), 1);
    const reset = resetScore(played);

    // Resetting to server 1 would hand the opening side an extra service turn
    // and put every rotation in the game out by one - the exact bug that was
    // fixed for a new game but never for a reset.
    expect(reset.serverNumber).toBe(initialServerNumber(g.config));
    expect(reset.score).toEqual({ team1: 0, team2: 0 });
  });

  it("returns the serve to whoever opened THIS game, not always team 1", () => {
    const g = official();
    // Game 2: the other side serves first.
    const g2 = startNewGame({ ...g, winner: 1 });
    expect(g2.servingTeam).toBe(2);

    const reset = resetScore(addScore(g2, 2));
    expect(reset.servingTeam).toBe(2);
  });
});

describe("rally scoring passes the serve to whoever won the rally", () => {
  it("moves the serve when the receiving team wins the point", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: false }));
    expect(g.servingTeam).toBe(1);

    // Team 2 receives and wins the rally: in rally scoring they take the point
    // AND the serve. Leaving the serve with team 1 meant the board claimed
    // team 1 was serving for a whole game no matter who won anything.
    const after = addScore(g, 2);
    expect(after.score).toEqual({ team1: 0, team2: 1 });
    expect(after.servingTeam).toBe(2);
  });

  it("leaves the serve alone when the serving team wins the point", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: false }));
    const after = addScore(g, 1);
    expect(after.servingTeam).toBe(1);
  });

  it("does not touch the serve in side-out scoring when the server scores", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: true }));
    const after = addScore(g, 1);
    expect(after.servingTeam).toBe(1);
    expect(after.score).toEqual({ team1: 1, team2: 0 });
  });
});

describe("a locked score is locked against every path, not just tapping", () => {
  it("refuses a manual correction while the score is locked", () => {
    const g = createGame("test", undefined, cfg({ scoreLocked: true }));
    // addScore already honoured the lock; adjustScore did not, so the +/-
    // controls could still move a score the user had deliberately frozen.
    expect(adjustScore(g, 1, +1)).toBe(g);
    expect(adjustScore(g, 1, -1)).toBe(g);
  });

  it("allows a correction once unlocked", () => {
    const g = createGame("test", undefined, cfg({ scoreLocked: false }));
    expect(adjustScore(g, 1, +1).score.team1).toBe(1);
  });
});

describe("game point belongs to the side that can actually score it", () => {
  it("does not call game point for a receiving team in side-out scoring", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: true, pointsToWin: 11 }));
    // Team 2 sits on 10 but team 1 is serving. Team 2 cannot score a point
    // from there - only the serving team can - so "Game point" over their
    // name is a lie about the rules.
    const state: GameSession = { ...g, score: { team1: 3, team2: 10 }, servingTeam: 1 };
    expect(pointStatus(state)).toBeNull();
  });

  it("calls game point for the serving team", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: true, pointsToWin: 11 }));
    const state: GameSession = { ...g, score: { team1: 10, team2: 3 }, servingTeam: 1 };
    expect(pointStatus(state)).toEqual({ team: 1, match: false });
  });

  it("still calls game point for either side in rally scoring", () => {
    const g = createGame("test", undefined, cfg({ sideOutScoring: false, pointsToWin: 11 }));
    const state: GameSession = { ...g, score: { team1: 3, team2: 10 }, servingTeam: 1 };
    expect(pointStatus(state)).toEqual({ team: 2, match: false });
  });
});
