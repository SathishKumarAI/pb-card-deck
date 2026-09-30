// @vitest-environment jsdom
/**
 * Round-trip every entity, because the failure this catches is invisible: a field
 * added to the local shape and not to the row simply stops travelling between
 * devices, and nothing errors.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { deckToRow, rowToDeck, matchToRow, rowToMatch, prefsToRow, rowToPrefs, mergePrefs } from "./rows";
import type { CustomDeck } from "../store/decks";
import type { SavedMatch } from "../store/matches";

beforeEach(() => localStorage.clear());

const deck: CustomDeck = {
  id: "local-deck-1",
  name: "Kitchen Chaos",
  description: "Dinks and dares",
  cards: [{ name: "Dinks only", effect: "Every shot is a dink", category: "Shot Restriction" }],
  created_at: 1_750_000_000_000,
};

const official: SavedMatch = {
  id: "local-match-1",
  mode: "tournament",
  team1_name: "Sam & Priya",
  team2_name: "Alex & Jordan",
  score_team1: 11,
  score_team2: 9,
  winner: 1,
  game_number: 3,
  duration_ms: 2_280_000,
  results: [{ team1: 11, team2: 7 }, { team1: 9, team2: 11 }],
  created_at: 1_750_000_500_000,
  official: true,
  event_label: "Club Ladder - SF",
  game_type: "doubles",
  timeouts: { team1: 1, team2: 2 },
  faults: { team1: 0, team2: 1 },
};

describe("decks", () => {
  it("survives the trip unchanged", () => {
    expect(rowToDeck(deckToRow(deck))).toEqual(deck);
  });

  it("carries the local id as client_id, so a pull can find the local row", () => {
    const row = deckToRow(deck);
    expect(row.client_id).toBe("local-deck-1");
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("never lets an empty name reject the whole batch", () => {
    const row = deckToRow({ ...deck, name: "" });
    expect(row.name).toBe("Untitled deck");
  });

  it("truncates to the column limits rather than being refused", () => {
    const row = deckToRow({ ...deck, name: "x".repeat(200), description: "y".repeat(900) });
    expect(row.name).toHaveLength(80);
    expect(row.description).toHaveLength(300);
  });
});

describe("matches", () => {
  it("survives the trip unchanged, officiating detail included", () => {
    expect(rowToMatch(matchToRow(official))).toEqual(official);
  });

  it("keeps a casual match casual - absent is not false", () => {
    const casual: SavedMatch = {
      id: "m2", mode: "family", team1_name: "A", team2_name: "B",
      score_team1: 11, score_team2: 4, winner: 1, game_number: 1,
      duration_ms: 900_000, results: [], created_at: 1_750_000_900_000,
    };
    const back = rowToMatch(matchToRow(casual));
    expect(back).toEqual(casual);
    expect(back).not.toHaveProperty("official");
    expect(back).not.toHaveProperty("event_label");
  });

  it("clamps nonsense rather than having a row rejected", () => {
    const row = matchToRow({ ...official, score_team1: 99_999, game_number: 0, duration_ms: -5, winner: 7 as 1 });
    expect(row.score_team1).toBe(999);
    expect(row.game_number).toBe(1);
    expect(row.duration_ms).toBe(0);
    expect(row.winner).toBeNull();
  });

  it("drops a game_type the column would refuse", () => {
    expect(matchToRow({ ...official, game_type: "quadruples" }).game_type).toBeNull();
  });
});

describe("prefs", () => {
  it("survives the trip unchanged", () => {
    const p = { favorites: [3, 1, 2], stats: { draws: 42, legendary: 1 } };
    expect(rowToPrefs(prefsToRow(p))).toEqual(p);
  });

  it("tolerates a row written before a field existed", () => {
    expect(rowToPrefs({ data: {} as never })).toEqual({ favorites: [], stats: {} });
  });
});

describe("mergePrefs", () => {
  it("keeps both phones' stars", () => {
    const merged = mergePrefs({ favorites: [1, 2], stats: {} }, { favorites: [2, 3], stats: {} });
    expect(merged.favorites.sort()).toEqual([1, 2, 3]);
  });

  it("never lets a counter go backwards", () => {
    const merged = mergePrefs({ favorites: [], stats: { draws: 120 } }, { favorites: [], stats: { draws: 40 } });
    expect(merged.stats.draws).toBe(120);
  });

  it("brings across a counter this device has never seen", () => {
    const merged = mergePrefs({ favorites: [], stats: { draws: 5 } }, { favorites: [], stats: { daily: 9 } });
    expect(merged.stats).toEqual({ draws: 5, daily: 9 });
  });
});
