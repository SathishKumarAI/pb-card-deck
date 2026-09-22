// @vitest-environment jsdom

/**
 * Round two of the bug hunt: defects found by exercising the running app
 * rather than by reading it. Each test failed when it was written.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createGame, addScore, pauseGame, resumePlay, DEFAULT_CONFIG, type GameConfig, type GameSession } from "./game";
import { addMatch, listMatches, clearMatches, matchSheet } from "./client-api";
import { shouldAskToSave } from "./historyConsent";

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({ ...DEFAULT_CONFIG, ...over });

/** A game that ran for 10 minutes of wall clock, 6 of them paused. */
function pausedGame(): GameSession {
  const start = 1_000_000;
  let g = createGame("test", { team1: "A", team2: "B" }, cfg({ pointsToWin: 1, winByTwo: false }));
  g = { ...g, startTime: start };
  g = pauseGame(g, start + 2 * 60_000);          // 2 min in, pause
  g = resumePlay(g, start + 8 * 60_000);         // 6 minutes paused
  g = addScore(g, 1);                            // and a winner, so it can be saved
  return g;
}

describe("a paused game does not bill the break as play", () => {
  beforeEach(() => { clearMatches(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("stores the played duration, not the wall clock", () => {
    const g = pausedGame();
    // "now" is 10 minutes after the start: 4 played, 6 paused.
    vi.setSystemTime(g.startTime + 10 * 60_000);
    addMatch(g);
    const saved = listMatches()[0];
    expect(Math.round(saved.duration_ms / 60_000)).toBe(4);
  });

  it("prints the played duration on the match sheet", () => {
    const g = pausedGame();
    vi.setSystemTime(g.startTime + 10 * 60_000);
    expect(matchSheet(g)).toContain("Duration: 4 min");
  });
});

describe("the save prompt asks once per match, not once per game", () => {
  it("asks for the first finished game of a match", () => {
    expect(shouldAskToSave("ask", undefined)).toEqual({ ask: true, save: false });
  });

  it("reuses the answer for the rest of that match instead of asking again", () => {
    // Best of 3: answering "save" on game 1 must not raise the dialog again
    // between games 2 and 3 - three dialogs in one match is why this exists.
    expect(shouldAskToSave("ask", true)).toEqual({ ask: false, save: true });
    expect(shouldAskToSave("ask", false)).toEqual({ ask: false, save: false });
  });

  it("never asks once a preference is remembered", () => {
    expect(shouldAskToSave("always", undefined)).toEqual({ ask: false, save: true });
    expect(shouldAskToSave("never", undefined)).toEqual({ ask: false, save: false });
    // A remembered preference outranks anything answered earlier in the match.
    expect(shouldAskToSave("always", false)).toEqual({ ask: false, save: true });
    expect(shouldAskToSave("never", true)).toEqual({ ask: false, save: false });
  });
});
