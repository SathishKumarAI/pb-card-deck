// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ScoreKeeper from "@/components/ScoreKeeper";
import { createGame, sideOut, addScore } from "./game";
import { ToastProvider } from "@/components/Toast";

/**
 * What the board SAYS, not just what the engine computes. The bug people
 * reported was a correct state described badly: "2nd server" on the opening
 * turn, and a serve moving when they expected a point.
 */
function board(game: Parameters<typeof ScoreKeeper>[0]["game"]) {
  return render(
    <ToastProvider>
      <ScoreKeeper game={game} onScore={vi.fn()} onSideOut={vi.fn()} onAdjust={vi.fn()} />
    </ToastProvider>,
  );
}

const official = () =>
  createGame("track", { team1: "Eagles", team2: "Hawks" }, { officialMode: true, gameType: "doubles" });

/** Each assertion reads ONE rendered board; queries are scoped to it so a
 *  second render in the same test cannot satisfy the first. */
const textOf = (game: Parameters<typeof ScoreKeeper>[0]["game"]) => {
  cleanup();
  return board(game).container.textContent ?? "";
};

describe("ScoreKeeper: serving state on screen", () => {
  it("explains the single first service turn instead of just showing 2nd server", () => {
    const text = textOf(official());
    expect(text).toMatch(/first service turn of the game/i);
    expect(text).toMatch(/one server only/i);
  });

  it("drops that note once the serve has changed hands", () => {
    expect(textOf(sideOut(official()))).not.toMatch(/first service turn of the game/i);
  });

  it("says what losing the rally does, and it differs on the opening turn", () => {
    // Opening turn: a fault is a side out, NOT a second server.
    const opening = textOf(official());
    expect(opening).toContain("Eagles won");
    expect(opening).toContain("Eagles lost");
    expect(opening).toMatch(/side out to Hawks/i);
    expect(opening).not.toMatch(/2nd server serves/i);

    // After a side-out both servers are live, so losing goes to the partner.
    expect(textOf(sideOut(official()))).toMatch(/2nd server serves/i);
  });

  it("labels which server is up for the serving side", () => {
    // Hawks serving, server 1 of 2.
    expect(textOf(sideOut(official()))).toContain("1st server");
  });

  it("shows the serving side's score going up, not the serve moving", () => {
    const g = sideOut(official());          // Hawks serving
    const after = addScore(g, 2);           // Hawks win the rally
    expect(after.score.team2).toBe(1);
    expect(after.serverNumber).toBe(1);     // same server plays on
    expect(textOf(after)).toContain("1st server");
  });
});
