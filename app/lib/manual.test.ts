import { describe, it, expect } from "vitest";
import { MANUAL, allEntries, searchManual } from "./manual";

describe("manual search", () => {
  it("matches every word in the query, not the phrase", () => {
    // The words are in different fields (question, answer, keywords) and in a
    // different order than the entry - a naive substring match finds nothing.
    const hits = searchManual("wrong score tap");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some(({ entry }) => entry.q.includes("wrong thing"))).toBe(true);
  });

  it("finds an answer by a word that appears only in its hidden keywords", () => {
    // "pwa" is nowhere in the visible text of the offline answer.
    const hits = searchManual("pwa");
    expect(hits.map(({ entry }) => entry.q)).toContain("Does it work without signal?");
  });

  it("returns everything for an empty query instead of nothing", () => {
    expect(searchManual("").length).toBe(allEntries().length);
    expect(searchManual("   ").length).toBe(allEntries().length);
  });

  it("returns no hits for a word nobody wrote", () => {
    expect(searchManual("badminton")).toHaveLength(0);
  });

  it("has a unique question per entry, so search results can be keyed by it", () => {
    const questions = allEntries().map(({ entry }) => entry.q);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("gives every section entries and every entry an answer", () => {
    for (const section of MANUAL) {
      expect(section.entries.length).toBeGreaterThan(0);
      for (const entry of section.entries) {
        expect(entry.a.length).toBeGreaterThan(40);
      }
    }
  });
});
