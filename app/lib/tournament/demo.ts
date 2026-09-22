/**
 * A worked example you can open and poke at.
 *
 * The point is not "here is some data" - it is that someone who has never run
 * an event can see, in one tap, what a half-finished pools-to-bracket day
 * looks like: pools mostly played, a table with a qualifying line, a bracket
 * already drawn, one score that was corrected, and matches still to play.
 *
 * So it is built by actually PLAYING an event through the real engine rather
 * than by hand-writing a fixture: whatever the engine does, the demo shows.
 */

import { createTournament, recordResult, playableMatches, logEvent } from "./engine";
import type { Tournament } from "./types";

const NAMES = [
  "Ana Reyes", "Ben Osei", "Cara Lin", "Dev Patel",
  "Elin Haas", "Femi Ade", "Gia Romano", "Hugo Marsh",
  "Iris Novak", "Jonah Weiss", "Kira Sato", "Leo Duarte",
  "Mira Shah", "Noah Berg", "Orla Quinn", "Pia Lundgren",
  "Quinn Farr", "Rosa Vidal", "Sami Khan", "Tara Ellis",
  "Umar Diallo", "Vera Brandt", "Wes Okafor", "Yuki Mori",
];

/** Deterministic pseudo-random, so the demo looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * A 12-team pools-then-bracket day, played up to the semi-finals.
 *
 * Deliberately NOT finished, and deliberately far enough along to have a
 * bracket: pools complete, quarter-finals done, one semi-final played and one
 * still live. That is the screen worth showing someone - a tree with results
 * flowing through it and a match still to enter.
 */
export function buildDemoTournament(): Tournament {
  const teams = [];
  for (let i = 0; i < NAMES.length; i += 2) {
    teams.push({ name: `${NAMES[i].split(" ")[0]} + ${NAMES[i + 1].split(" ")[0]}`, playerNames: [NAMES[i], NAMES[i + 1]] });
  }

  let t = createTournament({
    name: "Demo: Saturday Club Day",
    format: "pools-bracket",
    entryMode: "teams",
    teamSize: 2,
    players: NAMES.map((name) => ({ name })),
    teams,
    config: { courts: 4, pointsToWin: 11, poolCount: 4, advancePerPool: 2 },
  });

  const random = rng(1729);
  const seedOf = (id?: string) => t.teams.find((x) => x.id === id)?.seed ?? 99;

  /** Play one match: the better seed usually wins, and the score is plausible. */
  const play = (matchId: string) => {
    const m = t.matches.find((x) => x.id === matchId);
    if (!m || !m.teamA || !m.teamB) return;
    const aStronger = seedOf(m.teamA) < seedOf(m.teamB);
    const aWins = random() > 0.3 ? aStronger : !aStronger;
    const loserScore = Math.floor(random() * 9); // 0-8
    t = recordResult(t, m.id, aWins ? 11 : loserScore, aWins ? loserScore : 11);
  };

  // The whole pool stage, so the bracket gets drawn.
  const poolMatches = t.matches.filter((m) => m.bracket === "pool").map((m) => m.id);
  for (const id of poolMatches) play(id);

  // Then the knockout, stopping in the middle of the semi-finals.
  const knockoutRounds = [...new Set(t.matches.filter((m) => m.bracket === "winners").map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const quarters = t.matches.filter((m) => m.bracket === "winners" && m.round === knockoutRounds[0]);
  for (const m of quarters) play(m.id);
  const semis = t.matches.filter((m) => m.bracket === "winners" && m.round === knockoutRounds[1]);
  if (semis[0]) play(semis[0].id);

  // One score that was typed wrong and corrected, so the Changes tab shows the
  // thing it exists for.
  t = recordResult(t, poolMatches[2], 11, 4);

  t = logEvent(t, {
    kind: "note",
    text: "Demo event - open the Bracket and Changes tabs, or enter a score to watch the tree fill in",
  });

  return { ...t, id: `demo_${Date.now().toString(36)}` };
}

/** True for an event created from the demo, so the UI can label it. */
export function isDemo(t: Tournament): boolean {
  return t.id.startsWith("demo_");
}

/** How far along the demo is, for the button's subtitle. */
export function demoSummary(t: Tournament): string {
  const remaining = playableMatches(t).length;
  return `${t.teams.length} teams · ${remaining} matches still to play`;
}
