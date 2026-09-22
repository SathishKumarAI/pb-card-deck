import { describe, it, expect } from "vitest";
import { MANUAL, allEntries, searchManual, QUICK_LINKS } from "./manual";

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

  it("gives every section entries and every entry a real answer", () => {
    for (const section of MANUAL) {
      expect(section.entries.length).toBeGreaterThan(0);
      for (const entry of section.entries) {
        // The answer is the lead PLUS its points or steps. Measuring `a`
        // alone used to stand in for "this is not a stub", but the leads are
        // deliberately one line now and the substance sits in the list - so
        // the check has to look at the whole answer or it just punishes the
        // format we want.
        const whole = [entry.a, ...(entry.points ?? []), ...(entry.steps ?? [])].join(" ");
        expect(whole.length).toBeGreaterThan(40);
        expect(entry.a.length).toBeGreaterThan(0);
      }
    }
  });

  it("points every quick link at a question that exists", () => {
    const questions = new Set(allEntries().map(({ entry }) => entry.q));
    for (const link of QUICK_LINKS) {
      // A shortcut is matched to an entry by its exact question text. Renaming
      // an entry without updating this list left a button that opened nothing.
      expect(questions.has(link), `quick link has no entry: ${link}`).toBe(true);
    }
  });

  it("finds a rule by a word that only appears in an entry's points", () => {
    // "4.B.7" is written in exactly one point, nowhere in a question or lead.
    // If search stopped indexing points, this would silently return nothing.
    const hits = searchManual("4.B.7");
    expect(hits.length).toBeGreaterThan(0);
  });
});
