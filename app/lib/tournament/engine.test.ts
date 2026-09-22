import { describe, it, expect } from "vitest";
import {
  createTournament,
  playableMatches,
  recordResult,
  clearResult,
  liveMatches,
  addRotatingRound,
  splitIntoPools,
  progress,
  pairMixed,
} from "./engine";
import { standings, poolStandings, playerStandings } from "./standings";
import { bracketSize, seedOrder } from "./elimination";
import type { Format, Tournament } from "./types";

/* ── helpers ─────────────────────────────────────────────────────── */

function makeTeams(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Team ${i + 1}`,
    playerNames: [`P${i * 2 + 1}`, `P${i * 2 + 2}`],
  }));
}
function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}` }));
}

function build(format: Format, teamCount: number, config = {}): Tournament {
  const teams = makeTeams(teamCount);
  return createTournament({
    name: "Test event",
    format,
    entryMode: "teams",
    teamSize: 2,
    players: makePlayers(teamCount * 2),
    teams,
    config: { courts: 2, ...config },
  });
}

/**
 * Play the whole event out. The stronger seed wins unless `upsets` says
 * otherwise, so results are deterministic and a bracket's shape is testable.
 */
function playAll(t: Tournament, upsets: Set<string> = new Set()): Tournament {
  let cur = t;
  let guard = 0;
  while (cur.status !== "complete" && guard++ < 500) {
    const next = playableMatches(cur)[0];
    if (!next) break;
    const seedOf = (id?: string) => cur.teams.find((x) => x.id === id)?.seed ?? 99;
    const aStronger = seedOf(next.teamA) < seedOf(next.teamB);
    const flip = upsets.has(next.id);
    const aWins = flip ? !aStronger : aStronger;
    cur = recordResult(cur, next.id, aWins ? 11 : 5, aWins ? 5 : 11);
  }
  return cur;
}

const teamName = (t: Tournament, id?: string) => t.teams.find((x) => x.id === id)?.name;

/* ── bracket maths ───────────────────────────────────────────────── */

describe("bracket maths", () => {
  it("rounds a draw up to a power of two", () => {
    expect([2, 3, 5, 8, 11, 16, 17].map(bracketSize)).toEqual([2, 4, 8, 8, 16, 16, 32]);
  });

  it("seeds so the top two can only meet in the final", () => {
    // Assert the PROPERTIES of a seeded draw, not one drawing of it: several
    // slot orders are equally correct and differ only in how the bracket is
    // printed top to bottom.
    for (const size of [4, 8, 16, 32]) {
      const order = seedOrder(size);
      expect(new Set(order).size, `no repeats at ${size}`).toBe(size);
      // every first-round pair sums to size + 1: strongest meets weakest
      for (let i = 0; i < size; i += 2) expect(order[i] + order[i + 1]).toBe(size + 1);
      // seeds 1 and 2 sit in opposite halves, 3 and 4 in opposite quarters
      const half = size / 2;
      expect(order.indexOf(1) < half).toBe(true);
      expect(order.indexOf(2) >= half).toBe(true);
      const quarter = size / 4;
      const quarterOf = (seed: number) => Math.floor(order.indexOf(seed) / quarter);
      expect(new Set([1, 2, 3, 4].map(quarterOf)).size).toBe(4);
    }
  });
});

/* ── round robin ─────────────────────────────────────────────────── */

describe("round robin event", () => {
  it("plays every pair once and crowns the best record", () => {
    const t = build("round-robin", 6);
    expect(t.matches).toHaveLength(15); // 6*5/2
    const done = playAll(t);
    expect(done.status).toBe("complete");
    expect(teamName(done, done.championTeamId)).toBe("Team 1");
    const table = standings(done);
    expect(table[0].wins).toBe(5);
    expect(table[table.length - 1].wins).toBe(0);
    expect(table.reduce((n, r) => n + r.played, 0)).toBe(30); // 15 matches x 2 teams
  });

  it("breaks a straight two-way tie on head-to-head, not point difference", () => {
    let t = build("round-robin", 4);
    const [a, b, c, d] = t.teams.map((x) => x.id);
    const score = (x: string, y: string, xs: number, ys: number) => {
      const m = t.matches.find(
        (m) => (m.teamA === x && m.teamB === y) || (m.teamA === y && m.teamB === x),
      )!;
      const flip = m.teamA !== x;
      t = recordResult(t, m.id, flip ? ys : xs, flip ? xs : ys);
    };

    score(a, b, 11, 2);   // A wins big
    score(a, d, 11, 3);   // A wins big
    score(c, a, 11, 9);   // but C beat A
    score(c, b, 11, 9);
    score(d, c, 11, 5);
    score(b, d, 11, 6);

    const table = standings(t);
    const rankOf = (id: string) => table.find((r) => r.teamId === id)!.rank;
    const rowOf = (id: string) => table.find((r) => r.teamId === id)!;

    // A and C both finish 2-1 - exactly two teams level, so their meeting decides.
    expect(rowOf(a).wins).toBe(2);
    expect(rowOf(c).wins).toBe(2);
    expect(rowOf(a).diff).toBeGreaterThan(rowOf(c).diff); // A is well ahead on points
    expect(rankOf(c)).toBeLessThan(rankOf(a));            // and still ranks below C
  });

  it("falls back to point difference when three teams are level, rather than cycling", () => {
    // A beat B, B beat C, C beat A: head-to-head cannot order this, and a
    // comparator that tries makes the result depend on input order.
    let t = build("round-robin", 3);
    const [a, b, c] = t.teams.map((x) => x.id);
    const score = (x: string, y: string, xs: number, ys: number) => {
      const m = t.matches.find(
        (m) => (m.teamA === x && m.teamB === y) || (m.teamA === y && m.teamB === x),
      )!;
      const flip = m.teamA !== x;
      t = recordResult(t, m.id, flip ? ys : xs, flip ? xs : ys);
    };
    score(a, b, 11, 2);
    score(b, c, 11, 3);
    score(c, a, 11, 9);

    const table = standings(t);
    expect(table.every((r) => r.wins === 1)).toBe(true);
    expect(table.map((r) => r.teamId)).toEqual([a, b, c]); // +7, -1, -6 on difference
  });
});

/* ── single elimination ──────────────────────────────────────────── */

describe("single elimination", () => {
  it("gives byes to the top seeds and needs n-1 played matches", () => {
    const t = build("single-elim", 11);
    // 16-slot draw, 5 byes: those matches are settled on creation.
    expect(liveMatches(t)).toHaveLength(10); // 11 teams -> 10 real matches
    const done = playAll(t);
    expect(done.status).toBe("complete");
    expect(teamName(done, done.championTeamId)).toBe("Team 1");
    expect(progress(done)).toEqual({ played: 10, total: 10 });
  });

  it("carries an upset all the way through the bracket", () => {
    const t = build("single-elim", 8);
    const final = t.matches.find((m) => m.label === "Final")!;
    // Seed 1 wins the semi, then loses the final.
    const done = playAll(t, new Set([final.id]));
    expect(teamName(done, done.championTeamId)).toBe("Team 2");
  });

  it("labels the closing rounds", () => {
    const t = build("single-elim", 8);
    const labels = [...new Set(t.matches.map((m) => m.label))];
    expect(labels).toEqual(["Quarter-final", "Semi-final", "Final"]);
  });
});

/* ── double elimination ──────────────────────────────────────────── */

describe("double elimination", () => {
  it("lets a team lose once and still win the title", () => {
    const t = build("double-elim", 8);
    // Team 1 loses its first match, drops to the losers bracket, and wins out.
    const firstMatch = playableMatches(t)[0];
    let cur = recordResult(t, firstMatch.id, 5, 11); // seed 1 (side A) loses
    cur = playAllFavouringLoser(cur, firstMatch.teamA!);
    expect(cur.status).toBe("complete");
    expect(cur.championTeamId).toBe(firstMatch.teamA);
  });

  it("plays the reset only when the losers finalist wins the grand final", () => {
    const noReset = playAll(build("double-elim", 4));
    expect(noReset.status).toBe("complete");
    // The winners-bracket team won the grand final, so the reset never counts.
    expect(liveMatches(noReset).some((m) => m.id.endsWith("-gf-reset"))).toBe(false);

    // Force the losers finalist to win the grand final.
    let t = build("double-elim", 4);
    let guard = 0;
    while (t.status !== "complete" && guard++ < 100) {
      const m = playableMatches(t)[0];
      if (!m) break;
      const isGf = m.id.endsWith("-gf");
      const seedOf = (id?: string) => t.teams.find((x) => x.id === id)?.seed ?? 99;
      const aWins = isGf ? seedOf(m.teamA) > seedOf(m.teamB) : seedOf(m.teamA) < seedOf(m.teamB);
      t = recordResult(t, m.id, aWins ? 11 : 6, aWins ? 6 : 11);
    }
    expect(t.matches.find((m) => m.id.endsWith("-gf-reset"))?.winner).toBeDefined();
  });

  it("never sends a team to the losers bracket twice", () => {
    const done = playAll(build("double-elim", 8));
    const losses = new Map<string, number>();
    for (const m of liveMatches(done)) {
      if (!m.winner || !m.teamA || !m.teamB) continue;
      const loser = m.winner === m.teamA ? m.teamB : m.teamA;
      losses.set(loser, (losses.get(loser) ?? 0) + 1);
    }
    // Only the runner-up may carry two losses; nobody carries three.
    expect(Math.max(...losses.values())).toBeLessThanOrEqual(2);
  });
});

/** Play out an event, but the named team wins every match it appears in. */
function playAllFavouringLoser(t: Tournament, favourite: string): Tournament {
  let cur = t;
  let guard = 0;
  while (cur.status !== "complete" && guard++ < 200) {
    const m = playableMatches(cur)[0];
    if (!m) break;
    const aWins = m.teamA === favourite || (m.teamB !== favourite && true);
    cur = recordResult(cur, m.id, aWins ? 11 : 4, aWins ? 4 : 11);
  }
  return cur;
}

/* ── pools then bracket ──────────────────────────────────────────── */

describe("pools then bracket", () => {
  it("snakes the seeds so pools are balanced", () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}`, name: `T${i + 1}`, playerIds: [], seed: i + 1 }));
    const pools = splitIntoPools(teams, 2);
    expect(pools.map((p) => p.map((x) => x.seed))).toEqual([
      [1, 4, 5, 8],
      [2, 3, 6, 7],
    ]);
  });

  it("builds the knockout stage only once every pool is finished", () => {
    let t = build("pools-bracket", 8, { poolCount: 2, advancePerPool: 2 });
    expect(t.matches.every((m) => m.bracket === "pool")).toBe(true);

    // Play all but the final pool match.
    const poolMatches = t.matches.filter((m) => m.bracket === "pool");
    for (const m of poolMatches.slice(0, -1)) {
      const seedOf = (id?: string) => t.teams.find((x) => x.id === id)?.seed ?? 99;
      const aWins = seedOf(m.teamA) < seedOf(m.teamB);
      t = recordResult(t, m.id, aWins ? 11 : 6, aWins ? 6 : 11);
    }
    expect(t.matches.some((m) => m.bracket === "winners")).toBe(false);

    const last = poolMatches[poolMatches.length - 1];
    t = recordResult(t, last.id, 11, 7);
    expect(t.matches.some((m) => m.bracket === "winners")).toBe(true);
    // 4 qualifiers -> semis + final
    expect(t.matches.filter((m) => m.bracket === "winners")).toHaveLength(3);
  });

  it("keeps pool tables separate and crowns a champion from the bracket", () => {
    const done = playAll(build("pools-bracket", 8, { poolCount: 2, advancePerPool: 2 }));
    const tables = poolStandings(done);
    expect(tables.map((x) => x.pool)).toEqual(["A", "B"]);
    expect(tables[0].rows).toHaveLength(4);
    expect(done.status).toBe("complete");
    expect(teamName(done, done.championTeamId)).toBe("Team 1");
  });
});

/* ── rotating partners ───────────────────────────────────────────── */

describe("rotating partners", () => {
  const mixer = (players: number, rounds = 1) =>
    createTournament({
      name: "Mixer",
      format: "rotating",
      entryMode: "rotating",
      teamSize: 2,
      players: makePlayers(players),
      config: { courts: 3, rounds },
    });

  it("puts four players on each court and mints a pair per side", () => {
    const t = mixer(16);
    const round1 = t.matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(4);
    for (const m of round1) {
      const a = t.teams.find((x) => x.id === m.teamA)!;
      const b = t.teams.find((x) => x.id === m.teamB)!;
      expect(a.playerIds).toHaveLength(2);
      expect(b.playerIds).toHaveLength(2);
    }
    const playing = round1.flatMap((m) => [m.teamA, m.teamB]).flatMap((id) => t.teams.find((x) => x.id === id)!.playerIds);
    expect(new Set(playing).size).toBe(16);
  });

  it("sits out the leftovers and rotates who sits", () => {
    let t = mixer(18); // 4 on court, 2 spare
    const sitters = (round: number) => {
      const playing = new Set(
        t.matches.filter((m) => m.round === round).flatMap((m) => [m.teamA, m.teamB])
          .flatMap((id) => t.teams.find((x) => x.id === id)!.playerIds),
      );
      return t.players.filter((p) => !playing.has(p.id)).map((p) => p.id);
    };
    expect(sitters(1)).toHaveLength(2);

    // finish round 1, add round 2
    for (const m of t.matches.filter((m) => m.round === 1)) t = recordResult(t, m.id, 11, 7);
    t = addRotatingRound(t);
    expect(t.matches.some((m) => m.round === 2)).toBe(true);
    // nobody sits twice before everyone has sat once
    const both = [...sitters(1), ...sitters(2)];
    expect(new Set(both).size).toBe(both.length);
  });

  it("scores the player, not the pair", () => {
    let t = mixer(8);
    for (const m of t.matches.filter((m) => m.round === 1)) t = recordResult(t, m.id, 11, 4);
    const table = playerStandings(t);
    expect(table).toHaveLength(8);
    expect(table.filter((r) => r.wins === 1)).toHaveLength(4);
    expect(table[0].diff).toBe(7);
    expect(table.reduce((n, r) => n + r.played, 0)).toBe(8);
  });

  it("gives a player a different partner in the next round", () => {
    let t = mixer(8);
    const partnersOf = (playerId: string) =>
      t.teams
        .filter((x) => x.playerIds.includes(playerId))
        .flatMap((x) => x.playerIds.filter((p) => p !== playerId));
    for (const m of t.matches.filter((m) => m.round === 1)) t = recordResult(t, m.id, 11, 3);
    t = addRotatingRound(t);
    const someone = t.players[0].id;
    const partners = partnersOf(someone);
    expect(partners.length).toBeGreaterThanOrEqual(2);
    expect(new Set(partners).size).toBe(partners.length);
  });
});

/* ── correcting mistakes ─────────────────────────────────────────── */

describe("correcting a result", () => {
  it("clears the match and everything downstream of it", () => {
    let t = build("single-elim", 4);
    const semis = playableMatches(t);
    t = recordResult(t, semis[0].id, 11, 5);
    t = recordResult(t, semis[1].id, 11, 5);
    const final = playableMatches(t)[0];
    t = recordResult(t, final.id, 11, 9);
    expect(t.status).toBe("complete");

    t = clearResult(t, semis[0].id);
    expect(t.status).toBe("running");
    const finalAfter = t.matches.find((m) => m.id === final.id)!;
    expect(finalAfter.winner).toBeUndefined();
    expect(finalAfter.teamA).toBeUndefined(); // its feeder is undecided again
    expect(t.matches.find((m) => m.id === semis[1].id)!.winner).toBeDefined(); // untouched
  });

  it("re-seeds the playoff if a pool result is corrected", () => {
    let t = playAll(build("pools-bracket", 8, { poolCount: 2, advancePerPool: 2 }));
    const aPoolMatch = t.matches.find((m) => m.bracket === "pool")!;
    t = clearResult(t, aPoolMatch.id);
    expect(t.status).toBe("running");
    expect(playableMatches(t).some((m) => m.id === aPoolMatch.id)).toBe(true);
  });
});

/* ── courts ──────────────────────────────────────────────────────── */

describe("court assignment", () => {
  it("fills every court once and leaves the rest queued", () => {
    const t = build("round-robin", 8, { courts: 3 });
    const onCourt = t.matches.filter((m) => m.court);
    expect(onCourt).toHaveLength(3);
    expect(onCourt.map((m) => m.court).sort()).toEqual([1, 2, 3]);
  });

  it("puts only one match on a court at a time, across pools", () => {
    // Every pool has its own round 1, so assigning courts per round used to
    // hand three simultaneous pool matches the same court number.
    const t = build("pools-bracket", 24, { courts: 4, poolCount: 4 });
    const onCourt = t.matches.filter((m) => m.court);
    expect(onCourt).toHaveLength(4);
    expect(new Set(onCourt.map((m) => m.court)).size).toBe(4);
  });

  it("never puts a team on two courts at once", () => {
    const t = build("round-robin", 8, { courts: 4 });
    const playing = t.matches.filter((m) => m.court).flatMap((m) => [m.teamA!, m.teamB!]);
    expect(new Set(playing).size).toBe(playing.length);
  });

  it("moves a court on to the next match when one finishes", () => {
    let t = build("round-robin", 8, { courts: 2 });
    const first = t.matches.find((m) => m.court === 1)!;
    t = recordResult(t, first.id, 11, 4);
    expect(t.matches.find((m) => m.id === first.id)!.court).toBeUndefined();
    expect(t.matches.filter((m) => m.court)).toHaveLength(2);
  });
});

/* ── divisions, mixed pairing and the audit log ──────────────────── */

describe("mixed doubles", () => {
  it("pairs one of each, in rank order", () => {
    const g: Record<string, "m" | "f"> = { a: "m", b: "f", c: "m", d: "f" };
    expect(pairMixed(["a", "b", "c", "d"], (id) => g[id])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("still runs when the counts do not balance", () => {
    // 3 men, 1 woman: one mixed pair, then the leftovers pair off.
    const g: Record<string, "m" | "f"> = { a: "m", b: "m", c: "m", d: "f" };
    const pairs = pairMixed(["a", "b", "c", "d"], (id) => g[id]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual(["a", "d"]);
    expect(pairs[1]).toEqual(["b", "c"]); // same-sex, but nobody is left out
  });

  it("ignores unmarked names rather than guessing", () => {
    const pairs = pairMixed(["a", "b", "c", "d"], () => undefined);
    expect(pairs).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("the event log", () => {
  it("records creation, results, corrections and clears", () => {
    let t = build("round-robin", 4);
    expect(t.log?.[0].kind).toBe("created");

    const m = playableMatches(t)[0];
    t = recordResult(t, m.id, 11, 5);
    const result = t.log!.filter((l) => l.kind === "result");
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("11-5");

    // typing over an existing score is an EDIT, and says what it used to be
    t = recordResult(t, m.id, 11, 7);
    const edit = t.log!.filter((l) => l.kind === "edit");
    expect(edit).toHaveLength(1);
    expect(edit[0].text).toContain("was 11-5");

    t = clearResult(t, m.id);
    expect(t.log!.filter((l) => l.kind === "undo")).toHaveLength(1);
  });

  it("keeps the log in order, oldest first", () => {
    let t = build("round-robin", 4);
    for (const m of playableMatches(t).slice(0, 3)) t = recordResult(t, m.id, 11, 4);
    const times = t.log!.map((l) => l.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
