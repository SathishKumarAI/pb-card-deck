/**
 * The tournament engine: pure functions, same contract as lib/game.ts. Nothing
 * here touches React, the DOM or localStorage - you hand it a Tournament and
 * it hands you a new one.
 *
 * Everything funnels through `resolveSlots`, which walks the matches and fills
 * in any slot whose source is now known. That single pass is what advances a
 * bracket, awards a bye, seeds the playoff from finished pools, and decides a
 * double-elimination reset is not needed.
 */

import type {
  EntryMode,
  EventLogEntry,
  Format,
  Player,
  Slot,
  StandingRow,
  Team,
  Tournament,
  TournamentConfig,
  TournamentMatch,
} from "./types";
import { roundRobinMatches, roundRobinRoundCount } from "./roundRobin";
import { doubleElimMatches, singleElimMatches, bracketSize } from "./elimination";
import { standings, poolStandings } from "./standings";
import { FORMAT_INFO } from "./types";

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

/* ─────────────────────────── creation ─────────────────────────── */

/* ─────────────────────────── the log ─────────────────────────── */

/** Append one line to the event's audit trail. Oldest first, capped. */
export function logEvent(t: Tournament, entry: Omit<EventLogEntry, "at">): Tournament {
  const line: EventLogEntry = { at: Date.now(), ...entry };
  return { ...t, log: [...(t.log ?? []), line].slice(-400) };
}

/** "Sam + Priya 11-9 Alex + Jo" - the phrase used all over the log. */
export function describeResult(t: Tournament, m: TournamentMatch, a: number, b: number): string {
  const name = (id?: string) => t.teams.find((x) => x.id === id)?.name ?? "?";
  const where = m.label ?? (m.pool ? `Pool ${m.pool}` : `Round ${m.round}`);
  return `${where}: ${name(m.teamA)} ${a}-${b} ${name(m.teamB)}`;
}

export interface CreateInput {
  name: string;
  format: Format;
  entryMode: EntryMode;
  teamSize: number;
  /** Fixed-team events pass teams; rotating events pass players only. */
  players: { name: string; gender?: "m" | "f" }[];
  teams?: { name: string; playerNames: string[] }[];
  config: Partial<TournamentConfig>;
}

export const DEFAULT_CONFIG: TournamentConfig = {
  pointsToWin: 11,
  winByTwo: true,
  bestOf: 1,
  courts: 2,
  poolCount: 2,
  advancePerPool: 2,
  rounds: 5,
  cardsEnabled: false,
};

export function createTournament(input: CreateInput): Tournament {
  const config = { ...DEFAULT_CONFIG, ...input.config };
  const players: Player[] = input.players.map((p) => ({
    id: uid("p"),
    name: p.name.trim(),
    active: true,
    ...(p.gender ? { gender: p.gender } : {}),
  }));

  const byName = new Map(players.map((p) => [p.name, p.id] as const));
  const teams: Team[] =
    input.entryMode === "rotating"
      ? [] // pairs are minted per round
      : (input.teams ?? []).map((t, i) => ({
          id: uid("t"),
          name: t.name.trim(),
          playerIds: t.playerNames.map((n) => byName.get(n.trim())).filter(Boolean) as string[],
          seed: i + 1,
        }));

  const tournament: Tournament = {
    id: uid("ev"),
    name: input.name.trim() || "Tournament",
    createdAt: Date.now(),
    format: input.format,
    entryMode: input.entryMode,
    teamSize: input.teamSize,
    players,
    teams,
    matches: [],
    config,
    status: "running",
  };

  tournament.matches = buildMatches(tournament);
  const built = resolveSlots(tournament);
  return logEvent(built, {
    kind: "created",
    text: `Created: ${FORMAT_INFO[built.format].label}, ${
      built.entryMode === "rotating" ? `${built.players.length} players` : `${built.teams.length} teams`
    }, ${built.config.courts} court${built.config.courts === 1 ? "" : "s"}`,
  });
}

/**
 * Pair a flat list for mixed doubles: one marked "m" with one marked "f", in
 * rank order, so the strongest man plays with the strongest woman. Anyone
 * unmarked, or left over when the counts do not balance, pairs off normally -
 * a draw with 18 men and 14 women still runs, it just has four same-sex pairs.
 */
export function pairMixed(ids: string[], genderOf: (id: string) => "m" | "f" | undefined): string[][] {
  const men = ids.filter((id) => genderOf(id) === "m");
  const women = ids.filter((id) => genderOf(id) === "f");
  const rest = ids.filter((id) => !genderOf(id));

  const pairs: string[][] = [];
  while (men.length && women.length) pairs.push([men.shift()!, women.shift()!]);

  const leftovers = [...men, ...women, ...rest];
  for (let i = 0; i < leftovers.length; i += 2) {
    pairs.push(leftovers.slice(i, i + 2));
  }
  return pairs.filter((p) => p.length === 2);
}

/** The schedule for a freshly created event. */
function buildMatches(t: Tournament): TournamentMatch[] {
  const ids = t.teams.map((x) => x.id);

  switch (t.format) {
    case "round-robin":
      return roundRobinMatches(ids, { idPrefix: "rr" });

    case "single-elim":
      return singleElimMatches(ids, { idPrefix: "se" });

    case "double-elim":
      return doubleElimMatches(ids, { idPrefix: "de" });

    case "pools-bracket":
      return buildPools(t);

    case "rotating":
      return rotatingRound(t, 1);
  }
}

/* ─────────────────────────── pools ─────────────────────────── */

/**
 * Snake the seeds across pools (1,2,3,4 then 8,7,6,5 …) so every pool gets a
 * comparable spread of strength, then a round robin inside each. The bracket is
 * built once the pools finish, in `seedBracketFromPools`, because until then we
 * do not know who is in it.
 */
function buildPools(t: Tournament): TournamentMatch[] {
  const poolCount = Math.max(2, t.config.poolCount ?? 2);
  const pools = splitIntoPools(t.teams, poolCount);
  const out: TournamentMatch[] = [];

  pools.forEach((teams, i) => {
    const letter = String.fromCharCode(65 + i);
    out.push(
      ...roundRobinMatches(
        teams.map((x) => x.id),
        { idPrefix: `p${letter}`, bracket: "pool", pool: letter },
      ),
    );
  });

  return out;
}

export function splitIntoPools(teams: Team[], poolCount: number): Team[][] {
  const pools: Team[][] = Array.from({ length: poolCount }, () => []);
  const ordered = [...teams].sort((a, b) => a.seed - b.seed);
  ordered.forEach((team, i) => {
    const row = Math.floor(i / poolCount);
    const col = i % poolCount;
    // snake: every other row fills right-to-left
    pools[row % 2 === 0 ? col : poolCount - 1 - col].push(team);
  });
  return pools;
}

/** True once every pool match has a winner. */
export function poolsComplete(t: Tournament): boolean {
  const pool = t.matches.filter((m) => m.bracket === "pool");
  return pool.length > 0 && pool.every((m) => m.winner);
}

/**
 * Cross-seed the pool qualifiers into a knockout draw: overall 1st seeds first
 * (best record across pools), and a pool winner never meets a team from their
 * own pool before they have to.
 */
export function seedBracketFromPools(t: Tournament): TournamentMatch[] {
  const advance = Math.max(1, t.config.advancePerPool ?? 2);
  const tables = poolStandings(t);

  // Collect qualifiers as (position in pool, row), then order by position so
  // all pool winners are seeded above all runners-up.
  const qualifiers: { pos: number; row: StandingRow }[] = [];
  for (const { rows } of tables) {
    rows.slice(0, advance).forEach((row, i) => qualifiers.push({ pos: i, row }));
  }
  qualifiers.sort(
    (a, b) => a.pos - b.pos || b.row.wins - a.row.wins || b.row.diff - a.row.diff || b.row.pointsFor - a.row.pointsFor,
  );

  const seeded = qualifiers.map((q) => q.row.teamId);
  const offset = Math.max(...t.matches.map((m) => m.round), 0);
  return singleElimMatches(seeded, { idPrefix: "ko", roundOffset: offset });
}

/* ─────────────────────── rotating partners ─────────────────────── */

/**
 * One round of a partner mixer. Players are ranked (by current record, or by
 * entry order in round 1), split into groups of four by rank so games stay
 * competitive, and within each four the 1st and 4th play the 2nd and 3rd.
 * Whoever cannot make a full four sits out, and sit-outs rotate to the players
 * who have sat out least.
 */
export function rotatingRound(t: Tournament, round: number): TournamentMatch[] {
  const table = t.matches.length ? rotatingOrder(t) : t.players.map((p) => p.id);
  // A player sat out a round if they appear in no match of that round.
  const sitOutCount = new Map<string, number>();
  for (const p of t.players) sitOutCount.set(p.id, 0);
  const rounds = [...new Set(t.matches.map((m) => m.round))];
  for (const r of rounds) {
    const playing = new Set(
      t.matches
        .filter((m) => m.round === r)
        .flatMap((m) => [m.teamA, m.teamB])
        .flatMap((id) => t.teams.find((x) => x.id === id)?.playerIds ?? []),
    );
    for (const p of t.players) if (!playing.has(p.id)) sitOutCount.set(p.id, (sitOutCount.get(p.id) ?? 0) + 1);
  }

  const playable = table.filter((id) => t.players.find((p) => p.id === id)?.active !== false);
  const courtsWorth = Math.floor(playable.length / 4) * 4;
  const spare = playable.length - courtsWorth;

  // Sit out whoever has sat out least, tie-broken by lowest rank.
  const sitting = [...playable]
    .sort((a, b) => (sitOutCount.get(a) ?? 0) - (sitOutCount.get(b) ?? 0) || table.indexOf(b) - table.indexOf(a))
    .slice(0, spare);
  const active = playable.filter((id) => !sitting.includes(id));

  const mixed = t.config.division === "mixed";
  const genderOf = (id: string) => t.players.find((p) => p.id === id)?.gender;

  const matches: TournamentMatch[] = [];
  for (let i = 0; i < active.length; i += 4) {
    const quad = active.slice(i, i + 4);
    if (quad.length < 4) break;
    // Ranked fours keep games close: 1st plays with 4th against 2nd and 3rd.
    // A mixed draw pairs one of each inside the four instead, which matters
    // more than the rank spread.
    const [pa, pb] = mixed ? pairMixed(quad, genderOf) : [[quad[0], quad[3]], [quad[1], quad[2]]];
    if (!pa || !pb) break;
    const teamA = mintPair(t, pa, round);
    const teamB = mintPair(t, pb, round);
    matches.push({
      id: `rot-r${round}-m${i / 4 + 1}`,
      bracket: "rr",
      round,
      a: { from: "team", teamId: teamA.id },
      b: { from: "team", teamId: teamB.id },
      teamA: teamA.id,
      teamB: teamB.id,
    });
  }
  return matches;
}

/** Rank players for the next round: best record first. */
function rotatingOrder(t: Tournament): string[] {
  const wins = new Map<string, number>();
  const diff = new Map<string, number>();
  for (const p of t.players) { wins.set(p.id, 0); diff.set(p.id, 0); }
  for (const m of t.matches) {
    if (!m.winner || typeof m.scoreA !== "number" || typeof m.scoreB !== "number") continue;
    for (const [teamId, f, a] of [[m.teamA!, m.scoreA, m.scoreB], [m.teamB!, m.scoreB, m.scoreA]] as const) {
      for (const pid of t.teams.find((x) => x.id === teamId)?.playerIds ?? []) {
        if (m.winner === teamId) wins.set(pid, (wins.get(pid) ?? 0) + 1);
        diff.set(pid, (diff.get(pid) ?? 0) + (f - a));
      }
    }
  }
  return t.players
    .map((p) => p.id)
    .sort((a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0) || (diff.get(b) ?? 0) - (diff.get(a) ?? 0));
}

/** A pair exists as a Team so the rest of the engine needs no special case. */
function mintPair(t: Tournament, playerIds: string[], round: number): Team {
  const names = playerIds.map((id) => t.players.find((p) => p.id === id)?.name ?? "?");
  const team: Team = {
    id: `pair-r${round}-${playerIds.join("-")}`,
    name: names.join(" + "),
    playerIds,
    seed: 0,
  };
  if (!t.teams.some((x) => x.id === team.id)) t.teams.push(team);
  return team;
}

/** Add the next round of a mixer. Returns a new tournament. */
export function addRotatingRound(t: Tournament): Tournament {
  const played = [...new Set(t.matches.map((m) => m.round))];
  const next = (played.length ? Math.max(...played) : 0) + 1;
  const copy: Tournament = { ...t, teams: [...t.teams], matches: [...t.matches] };
  copy.matches = [...copy.matches, ...rotatingRound(copy, next)];
  return logEvent(assignCourts(copy), { kind: "round", text: `Round ${next} added` });
}

/* ─────────────────────── advancing play ─────────────────────── */

/** Resolve a slot to a team id, if it is knowable yet. */
function slotTeam(slot: Slot, byId: Map<string, TournamentMatch>): string | undefined {
  switch (slot.from) {
    case "team":
      return slot.teamId;
    case "bye":
      return undefined;
    case "winner": {
      const m = byId.get(slot.matchId);
      return m?.winner;
    }
    case "loser": {
      const m = byId.get(slot.matchId);
      if (!m?.winner || !m.teamA || !m.teamB) return undefined;
      return m.winner === m.teamA ? m.teamB : m.teamA;
    }
  }
}

/** True when a slot can never be filled - the feeding match was a bye. */
function slotIsDeadBye(slot: Slot, byId: Map<string, TournamentMatch>): boolean {
  if (slot.from === "bye") return true;
  if (slot.from !== "loser") return false;
  const m = byId.get(slot.matchId);
  return !!m && (m.a.from === "bye" || m.b.from === "bye");
}

/**
 * Fill every slot that is now knowable, walk byes forward, seed the playoff
 * bracket when pools finish, and mark the event complete when the last match
 * that matters has a winner. Runs to a fixed point, so one call settles a
 * chain of byes.
 */
export function resolveSlots(t: Tournament): Tournament {
  const matches = t.matches.map((m) => ({ ...m }));
  let changed = true;
  let guard = 0;

  while (changed && guard++ < 50) {
    changed = false;
    const byId = new Map(matches.map((m) => [m.id, m] as const));

    for (const m of matches) {
      if (!m.teamA) {
        const a = slotTeam(m.a, byId);
        if (a) { m.teamA = a; changed = true; }
      }
      if (!m.teamB) {
        const b = slotTeam(m.b, byId);
        if (b) { m.teamB = b; changed = true; }
      }

      // A team drawn against a bye advances without playing.
      if (!m.winner) {
        const aDead = slotIsDeadBye(m.a, byId);
        const bDead = slotIsDeadBye(m.b, byId);
        if (aDead && m.teamB) { m.winner = m.teamB; m.scoreA = 0; m.scoreB = 0; changed = true; }
        else if (bDead && m.teamA) { m.winner = m.teamA; m.scoreA = 0; m.scoreB = 0; changed = true; }
      }
    }
  }

  let next: Tournament = { ...t, matches };

  // Pools finished: build the knockout stage once.
  if (next.format === "pools-bracket" && poolsComplete(next) && !next.matches.some((m) => m.bracket === "winners")) {
    next = { ...next, matches: [...next.matches, ...seedBracketFromPools(next)] };
    next = resolveSlots(next);
  }

  return withStatus(assignCourts(next));
}

/** Decide whether the event is finished, and who won it. */
function withStatus(t: Tournament): Tournament {
  const relevant = liveMatches(t);
  const done = relevant.length > 0 && relevant.every((m) => m.winner);
  if (!done) return { ...t, status: "running", championTeamId: undefined };

  let champion: string | undefined;
  if (t.format === "round-robin" || t.format === "rotating") {
    champion = standings(t)[0]?.teamId;
  } else {
    const finals = relevant.filter((m) => m.bracket === "final" || m.bracket === "winners");
    const last = finals.sort((a, b) => a.round - b.round).pop();
    champion = last?.winner;
  }
  return { ...t, status: "complete", championTeamId: champion };
}

/**
 * Matches that still matter. A double-elimination reset is dropped when the
 * winners-bracket team takes the grand final, and bye matches never need
 * playing.
 */
export function liveMatches(t: Tournament): TournamentMatch[] {
  const gf = t.matches.find((m) => m.id.endsWith("-gf"));
  const reset = t.matches.find((m) => m.id.endsWith("-gf-reset"));
  const resetNeeded =
    !!gf?.winner && !!reset && gf.winner === (gf.b.from === "winner" ? slotWinnerOf(t, gf.b.matchId) : undefined);

  return t.matches.filter((m) => {
    if (m.a.from === "bye" || m.b.from === "bye") return false;
    if (reset && m.id === reset.id) return resetNeeded;
    return true;
  });
}

function slotWinnerOf(t: Tournament, matchId: string): string | undefined {
  return t.matches.find((m) => m.id === matchId)?.winner;
}

/** Matches that can be played right now: both teams known, no result yet. */
export function playableMatches(t: Tournament): TournamentMatch[] {
  return liveMatches(t)
    .filter((m) => m.teamA && m.teamB && !m.winner)
    .sort((a, b) => a.round - b.round || (a.court ?? 99) - (b.court ?? 99));
}

/**
 * Hand a match its result. Scores are kept even for a walkover so the standings
 * and the point difference tiebreak stay honest.
 */
export function recordResult(
  t: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number,
  opts: { playedInApp?: boolean } = {},
): Tournament {
  const before = t.matches.find((m) => m.id === matchId);
  const wasPlayed = !!before?.winner;

  const matches = t.matches.map((m) => {
    if (m.id !== matchId || !m.teamA || !m.teamB) return m;
    return {
      ...m,
      scoreA,
      scoreB,
      winner: scoreA === scoreB ? undefined : scoreA > scoreB ? m.teamA : m.teamB,
      playedInApp: opts.playedInApp ?? m.playedInApp,
      completedAt: Date.now(),
    };
  });

  let next = resolveSlots({ ...t, matches });
  if (before) {
    // A score typed over an existing one is a CORRECTION, and says so, with
    // what it used to be - that is the line other people need to see.
    next = wasPlayed
      ? logEvent(next, {
          kind: "edit",
          matchId,
          text: `${describeResult(t, before, scoreA, scoreB)} (was ${before.scoreA}-${before.scoreB})`,
        })
      : logEvent(next, {
          kind: "result",
          matchId,
          text: describeResult(t, before, scoreA, scoreB) + (opts.playedInApp ? " · played in app" : ""),
        });
  }
  return next;
}

/** Undo a result, and everything downstream of it. */
export function clearResult(t: Tournament, matchId: string): Tournament {
  const downstream = new Set<string>([matchId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of t.matches) {
      const feeds = [m.a, m.b].some((s) => (s.from === "winner" || s.from === "loser") && downstream.has(s.matchId));
      if (feeds && !downstream.has(m.id)) { downstream.add(m.id); changed = true; }
    }
  }

  const matches = t.matches.map((m) => {
    if (!downstream.has(m.id)) return m;
    const isSource = m.id === matchId;
    return {
      ...m,
      scoreA: undefined,
      scoreB: undefined,
      winner: undefined,
      completedAt: undefined,
      // Slots fed by the cleared match become unknown again; seeded slots stay.
      teamA: isSource || m.a.from === "team" ? m.teamA : undefined,
      teamB: isSource || m.b.from === "team" ? m.teamB : undefined,
    };
  });

  const cleared = resolveSlots({ ...t, matches });
  const was = t.matches.find((m) => m.id === matchId);
  return was?.winner
    ? logEvent(cleared, {
        kind: "undo",
        matchId,
        text: `Cleared ${describeResult(t, was, was.scoreA ?? 0, was.scoreB ?? 0)}`,
      })
    : cleared;
}

/**
 * Put every playable match on a court, round by round. Matches inside a round
 * never share a team, so a round can fill all courts at once; anything beyond
 * the court count waits its turn and shows no court number.
 */
export function assignCourts(t: Tournament): Tournament {
  const courts = Math.max(1, t.config.courts);
  const matches = t.matches.map((m) => ({ ...m, court: undefined as number | undefined }));

  // A court holds ONE match at a time, so only the first `courts` playable
  // matches get a number and everything else is "up next". Assigning by
  // round-and-modulo instead put three pool matches on court 1 at once,
  // because every pool has its own round 1.
  const queue = matches
    .filter((m) => !m.winner && m.teamA && m.teamB)
    .sort((a, b) => a.round - b.round);

  queue.slice(0, courts).forEach((m, i) => {
    m.court = i + 1;
  });

  return { ...t, matches };
}

/** Progress, for a header: played / total that matter. */
export function progress(t: Tournament): { played: number; total: number } {
  const live = liveMatches(t);
  return { played: live.filter((m) => m.winner).length, total: live.length };
}

export { bracketSize, roundRobinRoundCount };
