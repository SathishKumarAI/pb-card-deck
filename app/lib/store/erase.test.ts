// @vitest-environment jsdom
/**
 * "Delete all local data" must leave nothing of the user's own behind.
 *
 * Found while splitting the store (phase 2a stage 1): clearAllData enumerated
 * six keys by hand and three of them had been added to the app later - events,
 * saved games and the local feedback copy all survived an erase. Named for what
 * a user would see: they pressed delete, and their tournaments were still there.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { clearAllData } from "./prefs";
import {
  DECKS_KEY,
  MATCHES_KEY,
  FAVORITES_KEY,
  STATS_KEY,
  EVENTS_KEY,
  FEEDBACK_KEY,
  ACTIVE_GAME_KEY,
  SAVED_GAMES_KEY,
  INTRO_SEEN_KEY,
  USER_DATA_KEYS,
  PREFERENCE_KEYS,
} from "./keys";

const EVERY_USER_KEY = [
  DECKS_KEY,
  MATCHES_KEY,
  FAVORITES_KEY,
  STATS_KEY,
  EVENTS_KEY,
  FEEDBACK_KEY,
  ACTIVE_GAME_KEY,
  SAVED_GAMES_KEY,
  INTRO_SEEN_KEY,
];

describe("clearAllData", () => {
  beforeEach(() => {
    localStorage.clear();
    for (const k of [...EVERY_USER_KEY, ...PREFERENCE_KEYS]) {
      localStorage.setItem(k, JSON.stringify(["something the user made"]));
    }
  });

  it("erases the tournaments a user ran, not only their matches", () => {
    clearAllData();
    expect(localStorage.getItem(EVENTS_KEY)).toBeNull();
  });

  it("erases the in-progress games and the local copy of submitted feedback", () => {
    clearAllData();
    expect(localStorage.getItem(SAVED_GAMES_KEY)).toBeNull();
    expect(localStorage.getItem(FEEDBACK_KEY)).toBeNull();
  });

  it("erases every key the store counts as the user's own data", () => {
    clearAllData();
    const left = EVERY_USER_KEY.filter((k) => localStorage.getItem(k) !== null);
    expect(left).toEqual([]);
  });

  it("keeps preferences, because erasing your matches should not reset your theme", () => {
    clearAllData();
    for (const k of PREFERENCE_KEYS) {
      expect(localStorage.getItem(k)).not.toBeNull();
    }
  });

  it("enumerates keys rather than hard-coding a list, so a new entity cannot be missed", () => {
    // Every key in the module's own catalogue is covered by the erase list.
    expect([...USER_DATA_KEYS].sort()).toEqual([...EVERY_USER_KEY].sort());
  });
});
