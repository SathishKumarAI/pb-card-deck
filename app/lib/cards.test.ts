import { describe, it, expect } from "vitest";
import {
  shuffleArray,
  getFilteredCards,
  getCardsForLevel,
  getDeck,
  isSkillLevel,
  selectionLabel,
  SKILL_LEVELS,
  DECK_MODES,
  CATEGORIES,
  type Card,
} from "./cards";

const mk = (id: number, category: string): Card => ({
  id,
  category,
  name: `card-${id}`,
  effect: "do thing",
  vibe: "fun",
});

describe("shuffleArray", () => {
  it("preserves length and all elements (is a permutation)", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffleArray(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([7])).toEqual([7]);
  });
});

describe("getFilteredCards", () => {
  const deck: Card[] = CATEGORIES.map((c, i) => mk(i, c));

  it("returns only cards in the deck mode's categories", () => {
    const drill = getFilteredCards(deck, "drill");
    const cats = new Set(DECK_MODES.drill.categories);
    expect(drill.length).toBe(DECK_MODES.drill.categories.length);
    expect(drill.every((c) => cats.has(c.category))).toBe(true);
  });

  it("chaos mode includes every category", () => {
    const chaos = getFilteredCards(deck, "chaos");
    expect(chaos).toHaveLength(CATEGORIES.length);
  });

  it("returns nothing when no card matches", () => {
    const off = [mk(99, "Not A Real Category")];
    expect(getFilteredCards(off, "family")).toHaveLength(0);
  });
});

describe("skill levels", () => {
  // One easy + one hard card per category, low and high intensity.
  const deck: Card[] = CATEGORIES.flatMap((c, i) => [
    { ...mk(i * 2 + 1, c), intensity: 1 },
    { ...mk(i * 2 + 2, c), intensity: 5 },
  ]);

  it("beginner keeps only easy categories AND low intensity", () => {
    const out = getCardsForLevel(deck, "beginner");
    const cats = new Set(SKILL_LEVELS.beginner.categories);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((c) => cats.has(c.category))).toBe(true);
    expect(out.every((c) => (c.intensity ?? 3) <= 2)).toBe(true);
  });

  it("advanced includes every category and the highest intensity", () => {
    const out = getCardsForLevel(deck, "advanced");
    expect(out).toHaveLength(deck.length);
    expect(out.some((c) => c.intensity === 5)).toBe(true);
  });

  it("beginner pool is a subset of intermediate is a subset of advanced", () => {
    const b = getCardsForLevel(deck, "beginner").length;
    const i = getCardsForLevel(deck, "intermediate").length;
    const a = getCardsForLevel(deck, "advanced").length;
    expect(b).toBeLessThanOrEqual(i);
    expect(i).toBeLessThanOrEqual(a);
  });

  it("isSkillLevel distinguishes levels from deck modes", () => {
    expect(isSkillLevel("beginner")).toBe(true);
    expect(isSkillLevel("chaos")).toBe(false);
  });

  it("getDeck resolves both skill levels and deck modes", () => {
    expect(getDeck(deck, "advanced")).toHaveLength(deck.length);
    expect(getDeck(deck, "chaos")).toHaveLength(deck.length); // chaos = all categories
  });

  it("selectionLabel handles both kinds and unknowns", () => {
    expect(selectionLabel("beginner")).toBe("Beginner");
    expect(selectionLabel("chaos")).toBe(DECK_MODES.chaos.label);
    expect(selectionLabel("mystery")).toBe("mystery");
  });
});
