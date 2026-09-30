// @vitest-environment jsdom
/**
 * The first sign-in. The promise being tested: **the dialog cannot overstate what it
 * is about to upload, and declining never deletes anything.**
 */
import { describe, it, expect, beforeEach } from "vitest";
import { localDataCounts, shouldAskToClaim, claimLocalData, declineClaim, claimAnswered } from "./claim";
import { saveDeck, listDecks } from "../store/decks";
import { toggleFavorite, listFavoriteIds } from "../store/prefs";
import { addMatch } from "../store/matches";
import { listOutbox, setSyncEnabled, clearOutbox } from "./outbox";
import { createGame } from "../game";
import { saveTournament } from "../store/tournaments";
import { buildDemoTournament } from "../tournament/demo";

const USER = "user-123";

function finishedGame() {
  const g = createGame("chaos", { team1: "A", team2: "B" });
  return { ...g, score: { team1: 11, team2: 6 }, winner: 1 as const };
}

beforeEach(() => {
  localStorage.clear();
  clearOutbox();
  setSyncEnabled(true);
});

describe("whether to ask at all", () => {
  it("does not ask when the device is empty - an empty dialog is noise", () => {
    expect(localDataCounts().empty).toBe(true);
    expect(shouldAskToClaim(USER)).toBe(false);
  });

  it("asks when there is something to bring", () => {
    saveDeck({ name: "D", description: "", cards: [] });
    expect(shouldAskToClaim(USER)).toBe(true);
  });

  it("asks once per account, not once per sign-in", () => {
    saveDeck({ name: "D", description: "", cards: [] });
    declineClaim(USER);
    expect(shouldAskToClaim(USER)).toBe(false);
    expect(claimAnswered(USER)).toBe(true);
    // A different account on the same device is a separate question.
    expect(shouldAskToClaim("someone-else")).toBe(true);
  });

  it("never asks when there is no session", () => {
    saveDeck({ name: "D", description: "", cards: [] });
    expect(shouldAskToClaim(null)).toBe(false);
  });
});

describe("the counts it shows", () => {
  it("counts what is actually on the device", () => {
    saveDeck({ name: "One", description: "", cards: [] });
    saveDeck({ name: "Two", description: "", cards: [] });
    addMatch(finishedGame());
    toggleFavorite(42);
    expect(localDataCounts()).toEqual({ decks: 2, matches: 1, events: 0, favorites: 1, empty: false });
  });

  it("counts an event someone ran", () => {
    saveTournament(buildDemoTournament());
    expect(localDataCounts().events).toBe(1);
    expect(shouldAskToClaim(USER)).toBe(true);
  });

  it("queues exactly what it promised to queue, events included", () => {
    saveDeck({ name: "One", description: "", cards: [] });
    saveDeck({ name: "Two", description: "", cards: [] });
    addMatch(finishedGame());
    toggleFavorite(7);
    saveTournament(buildDemoTournament());
    clearOutbox(); // pretend those writes predate the account

    const promised = claimLocalData(USER);
    const queued = listOutbox();
    expect(queued.filter((e) => e.entity === "decks")).toHaveLength(promised.decks);
    expect(queued.filter((e) => e.entity === "matches")).toHaveLength(promised.matches);
    expect(queued.filter((e) => e.entity === "events")).toHaveLength(promised.events);
    // Favourites and counters travel as the single prefs row.
    expect(queued.filter((e) => e.entity === "prefs")).toHaveLength(1);
  });
});

describe("declining", () => {
  it("deletes nothing and queues nothing", () => {
    saveDeck({ name: "Mine", description: "", cards: [] });
    addMatch(finishedGame());
    toggleFavorite(3);
    clearOutbox();

    declineClaim(USER);

    expect(listDecks()).toHaveLength(1);
    expect(listFavoriteIds()).toEqual([3]);
    expect(listOutbox()).toHaveLength(0);
  });
});
