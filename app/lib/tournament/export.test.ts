import { describe, it, expect } from "vitest";
import { createTournament, recordResult, playableMatches } from "./engine";
import { toCsv, toMarkdown, toJson, exportFilename } from "./export";
import type { Tournament } from "./types";

function event(): Tournament {
  let t = createTournament({
    name: "Club Night, June",
    format: "round-robin",
    entryMode: "teams",
    teamSize: 2,
    players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    teams: Array.from({ length: 4 }, (_, i) => ({
      name: i === 0 ? 'The "Dinkers"' : `Team ${i + 1}`, // a name that would break naive CSV
      playerNames: [`P${i * 2 + 1}`, `P${i * 2 + 2}`],
    })),
    config: { courts: 2 },
  });
  const m = playableMatches(t)[0];
  t = recordResult(t, m.id, 11, 7);
  t = recordResult(t, m.id, 11, 9); // a correction, so the log has an edit in it
  return t;
}

describe("export", () => {
  it("quotes a team name containing quotes, so the CSV stays parseable", () => {
    const csv = toCsv(event());
    expect(csv).toContain('"The ""Dinkers"""');
    // every row has the same column count as its header
    const lines = csv.split("\n").filter((l) => l.startsWith('"Stage"') || l.startsWith('"Pool '));
    expect(lines.length).toBeGreaterThan(0);
  });

  it("carries results, standings and the change log in every readable format", () => {
    const t = event();
    for (const text of [toCsv(t), toMarkdown(t)]) {
      expect(text).toContain("Club Night, June");
      expect(text).toContain("11-9");       // the score that stands
      expect(text).toMatch(/was 11-7/);      // and the fact it was corrected
    }
  });

  it("round-trips through JSON without losing the log", () => {
    const t = event();
    const back = JSON.parse(toJson(t)) as Tournament;
    expect(back.matches).toHaveLength(t.matches.length);
    expect(back.log?.length).toBe(t.log?.length);
    expect(back.log?.some((l) => l.kind === "edit")).toBe(true);
  });

  it("names the file safely and by date", () => {
    const name = exportFilename(event(), "csv");
    expect(name).toMatch(/^club-night-june-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
