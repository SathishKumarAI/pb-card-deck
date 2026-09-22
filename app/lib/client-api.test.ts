// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createGame, recordTimeout, recordFault } from "./game";
import { addMatch, listMatches, matchSheet, clearMatches } from "./client-api";

// A finished official doubles match: Hawks beat Eagles 11-6, with a couple of
// timeouts and a fault logged, under an event label.
function finishedOfficial() {
  let g = createGame("chaos", { team1: "Eagles", team2: "Hawks" }, {
    officialMode: true,
    gameType: "doubles",
    pointsToWin: 11,
    bestOf: 1,
    eventLabel: "Club Ladder - QF",
    cardsEnabled: false,
  });
  g = recordTimeout(g, 1);
  g = recordTimeout(g, 2);
  g = recordFault(g, 1);
  g = { ...g, score: { team1: 6, team2: 11 }, winner: 2, gameResults: [] };
  return g;
}

describe("official match -> history", () => {
  beforeEach(() => clearMatches());

  it("addMatch persists official fields (event, format, timeouts, faults)", () => {
    addMatch(finishedOfficial());
    const [m] = listMatches();
    expect(m).toBeTruthy();
    expect(m.official).toBe(true);
    expect(m.event_label).toBe("Club Ladder - QF");
    expect(m.game_type).toBe("doubles");
    expect(m.team1_name).toBe("Eagles");
    expect(m.team2_name).toBe("Hawks");
    expect(m.winner).toBe(2);
    expect(m.timeouts).toEqual({ team1: 1, team2: 1 });
    expect(m.faults).toEqual({ team1: 1, team2: 0 });
  });

  it("casual matches carry no official fields", () => {
    const g = { ...createGame("family", { team1: "A", team2: "B" }), score: { team1: 11, team2: 9 }, winner: 1 as const };
    addMatch(g);
    const [m] = listMatches();
    expect(m.official).toBeUndefined();
    expect(m.event_label).toBeUndefined();
  });
});

describe("matchSheet", () => {
  it("renders a readable sheet with the key facts", () => {
    const sheet = matchSheet(finishedOfficial());
    expect(sheet).toContain("PICKLEBALL MATCH SHEET");
    expect(sheet).toContain("Event: Club Ladder - QF");
    expect(sheet).toContain("Format: doubles (official)");
    expect(sheet).toContain("Eagles  vs  Hawks");
    expect(sheet).toContain("Winner: Hawks");
    expect(sheet).toContain("Game 1:  6 - 11");
    expect(sheet).toContain("Timeouts:");
    expect(sheet).toContain("Faults:");
  });

  it("omits event line when no label, and marks unfinished games", () => {
    const g = createGame("chaos", { team1: "A", team2: "B" }, { officialMode: true, gameType: "singles" });
    const sheet = matchSheet(g);
    expect(sheet).not.toContain("Event:");
    expect(sheet).toContain("Format: singles (official)");
    expect(sheet).toContain("Winner: (unfinished)");
  });
});
