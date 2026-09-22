import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATEGORIES, RARITY_STYLE, type Card } from "./cards";

// Content/quality gate for the shipped deck (backlog F541, F542). Runs against
// the real public/cards.json so a bad regeneration can never reach production.
const cards: Card[] = JSON.parse(readFileSync("public/cards.json", "utf-8"));
const validRarities = new Set(Object.keys(RARITY_STYLE));
const validCategories = new Set<string>(CATEGORIES);

describe("cards.json deck integrity", () => {
  it("holds exactly 1,729 cards (the taxicab number)", () => {
    expect(cards).toHaveLength(1729);
  });

  it("has unique ids", () => {
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique names (case-insensitive primary key)", () => {
    const names = cards.map((c) => c.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("every card is complete and well-formed", () => {
  it("has non-empty core text fields", () => {
    const bad = cards.filter(
      (c) => !c.name?.trim() || !c.effect?.trim() || !c.vibe?.trim(),
    );
    expect(bad).toEqual([]);
  });

  it("has a commentator voice and a richer detail on every card (F501, F502)", () => {
    const missing = cards.filter(
      (c) => !c.commentary?.trim() || !c.detail || c.detail.trim().length < 12,
    );
    expect(missing.map((c) => c.id)).toEqual([]);
  });

  it("never duplicates the bare effect as commentary (F501)", () => {
    const dupes = cards.filter((c) => c.commentary?.trim() === c.effect.trim());
    expect(dupes.map((c) => c.id)).toEqual([]);
  });

  it("uses a valid category and rarity", () => {
    const bad = cards.filter(
      (c) => !validCategories.has(c.category) || !c.rarity || !validRarities.has(c.rarity),
    );
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it("has an intensity in 1..5", () => {
    const bad = cards.filter(
      (c) => typeof c.intensity !== "number" || c.intensity < 1 || c.intensity > 5,
    );
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it("has at least one tag", () => {
    const bad = cards.filter((c) => !Array.isArray(c.tags) || c.tags.length === 0);
    expect(bad.map((c) => c.id)).toEqual([]);
  });
});
