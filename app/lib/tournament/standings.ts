/**
 * Standings and tiebreaks.
 *
 * Owns: turning completed matches into an ordered table. Ordering is wins,
 * then head-to-head when exactly two teams are level (any more and head-to-head
 * is usually circular, so it is skipped), then point difference, then points
 * scored. Ties that survive all of that keep a stable order rather than
 * pretending to be separated.
 */

import type { StandingRow, Tournament, TournamentMatch } from "./types";

function blankRow(teamId: string, name: string, pool?: string): StandingRow {
  return { teamId, name, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, pool, rank: 0 };
}

/** Matches that count towards a table: played, with both teams and a score. */
export function playedMatches(matches: TournamentMatch[]): TournamentMatch[] {
  return matches.filter(
    (m) => m.winner && m.teamA && m.teamB && typeof m.scoreA === "number" && typeof m.scoreB === "number",
  );
}

/**
 * Table for a set of teams over a set of matches. Pass the pool's matches to
 * get a pool table, or every match for the whole event.
 */
export function standings(
  tournament: Tournament,
  opts: { matches?: TournamentMatch[]; teamIds?: string[]; pool?: string } = {},
): StandingRow[] {
  const teams = opts.teamIds
    ? tournament.teams.filter((t) => opts.teamIds!.includes(t.id))
    : tournament.teams;
  const source = opts.matches ?? tournament.matches;
  const counted = playedMatches(source);

  const rows = new Map<string, StandingRow>();
  for (const team of teams) rows.set(team.id, blankRow(team.id, team.name, opts.pool));

  for (const m of counted) {
    const a = rows.get(m.teamA!);
    const b = rows.get(m.teamB!);
    if (!a || !b) continue; // a bracket match involving a team outside this table
    a.played++; b.played++;
    a.pointsFor += m.scoreA!; a.pointsAgainst += m.scoreB!;
    b.pointsFor += m.scoreB!; b.pointsAgainst += m.scoreA!;
    if (m.winner === m.teamA) { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
  }

  for (const row of rows.values()) row.diff = row.pointsFor - row.pointsAgainst;

  const table = [...rows.values()];
  const order = new Map(teams.map((t, i) => [t.id, i] as const));

  // Head-to-head is only applied to a straight TWO-way tie. With three or more
  // teams level it is usually circular - A beat B, B beat C, C beat A - and a
  // comparator that answers those three questions inconsistently makes Array
  // .sort produce an order that depends on the input order. Count the teams on
  // each win total first, and fall through to point difference for any group
  // bigger than two.
  const atWins = new Map<number, number>();
  for (const row of table) atWins.set(row.wins, (atWins.get(row.wins) ?? 0) + 1);

  table.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (atWins.get(x.wins) === 2) {
      const h2h = headToHead(counted, x.teamId, y.teamId);
      if (h2h !== 0) return h2h;
    }
    if (y.diff !== x.diff) return y.diff - x.diff;
    if (y.pointsFor !== x.pointsFor) return y.pointsFor - x.pointsFor;
    return (order.get(x.teamId) ?? 0) - (order.get(y.teamId) ?? 0); // stable, by seed
  });

  table.forEach((row, i) => (row.rank = i + 1));
  return table;
}

/**
 * -1 if `a` should rank above `b` on their meetings, 1 for the reverse, 0 if
 * they never met or split. Only meaningful for a straight two-way tie, which
 * is why the caller reaches it after comparing wins.
 */
export function headToHead(matches: TournamentMatch[], a: string, b: string): number {
  let aWins = 0;
  let bWins = 0;
  for (const m of matches) {
    const pair = (m.teamA === a && m.teamB === b) || (m.teamA === b && m.teamB === a);
    if (!pair) continue;
    if (m.winner === a) aWins++;
    else if (m.winner === b) bWins++;
  }
  if (aWins === bWins) return 0;
  return aWins > bWins ? -1 : 1;
}

/** One table per pool, keyed by pool letter, in pool order. */
export function poolStandings(tournament: Tournament): { pool: string; rows: StandingRow[] }[] {
  const pools = [...new Set(tournament.matches.filter((m) => m.pool).map((m) => m.pool!))].sort();
  return pools.map((pool) => {
    const matches = tournament.matches.filter((m) => m.pool === pool);
    const teamIds = [...new Set(matches.flatMap((m) => [m.teamA, m.teamB]).filter(Boolean) as string[])];
    return { pool, rows: standings(tournament, { matches, teamIds, pool }) };
  });
}

/**
 * Rotating play scores the PERSON. A player's record is the record of whatever
 * pair they happened to be in that round.
 */
export function playerStandings(tournament: Tournament): StandingRow[] {
  const byPlayer = new Map<string, StandingRow>();
  for (const p of tournament.players) byPlayer.set(p.id, blankRow(p.id, p.name));

  const teamOf = new Map(tournament.teams.map((t) => [t.id, t] as const));

  for (const m of playedMatches(tournament.matches)) {
    const sides: [string, number, number][] = [
      [m.teamA!, m.scoreA!, m.scoreB!],
      [m.teamB!, m.scoreB!, m.scoreA!],
    ];
    for (const [teamId, forPts, againstPts] of sides) {
      for (const playerId of teamOf.get(teamId)?.playerIds ?? []) {
        const row = byPlayer.get(playerId);
        if (!row) continue;
        row.played++;
        row.pointsFor += forPts;
        row.pointsAgainst += againstPts;
        if (m.winner === teamId) row.wins++;
        else row.losses++;
      }
    }
  }

  const table = [...byPlayer.values()];
  for (const row of table) row.diff = row.pointsFor - row.pointsAgainst;
  table.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pointsFor - x.pointsFor || x.name.localeCompare(y.name));
  table.forEach((row, i) => (row.rank = i + 1));
  return table;
}
