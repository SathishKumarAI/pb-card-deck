/**
 * Knockout brackets: single and double elimination.
 *
 * Owns the WIRING of a bracket - which match feeds which, where a loser goes,
 * and what each round is called. It never decides who won; `engine.ts` records
 * results and calls `resolveSlots` to push teams forward.
 *
 * Byes are real slots, not a special case sprinkled through the code: a team
 * drawn against `{ from: "bye" }` wins that match the moment the bracket is
 * built, which is what keeps an 11-team draw as simple as a 16-team one.
 */

import type { TournamentMatch, Slot } from "./types";

/** Smallest power of two that fits n. */
export function bracketSize(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return Math.max(size, 2);
}

/**
 * Standard tournament seeding for a bracket of `size`, as 1-based seed numbers
 * in slot order: 1 plays the lowest seed, and the top two seeds can only meet
 * in the final. Built by reflection: [1,2] -> [1,4,3,2] -> [1,8,5,4,3,6,7,2].
 */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const round = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, round + 1 - seed);
    }
    order = next;
  }
  return order;
}

/** "Final", "Semi-final", … counting back from the last round. */
export function roundLabel(roundsFromEnd: number): string {
  if (roundsFromEnd === 0) return "Final";
  if (roundsFromEnd === 1) return "Semi-final";
  if (roundsFromEnd === 2) return "Quarter-final";
  return `Round of ${2 ** (roundsFromEnd + 1)}`;
}

/**
 * Single-elimination bracket over `teamIds`, which must already be in seed
 * order (strongest first). Returns matches wired winner-to-winner.
 */
export function singleElimMatches(
  teamIds: string[],
  opts: { idPrefix?: string; roundOffset?: number; bracket?: "winners" } = {},
): TournamentMatch[] {
  const { idPrefix = "se", roundOffset = 0, bracket = "winners" } = opts;
  const size = bracketSize(teamIds.length);
  const order = seedOrder(size);
  const totalRounds = Math.log2(size);
  const out: TournamentMatch[] = [];

  // Round 1 from seeds, with byes where the draw is short.
  const slotFor = (seed: number): Slot => {
    const team = teamIds[seed - 1];
    return team ? { from: "team", teamId: team } : { from: "bye" };
  };

  let previousIds: string[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = size / 2 ** r;
    const ids: string[] = [];
    for (let i = 0; i < matchCount; i++) {
      const id = `${idPrefix}-r${r}-m${i + 1}`;
      ids.push(id);
      const a: Slot = r === 1 ? slotFor(order[i * 2]) : { from: "winner", matchId: previousIds[i * 2] };
      const b: Slot = r === 1 ? slotFor(order[i * 2 + 1]) : { from: "winner", matchId: previousIds[i * 2 + 1] };
      out.push({
        id,
        bracket,
        round: r + roundOffset,
        a,
        b,
        label: roundLabel(totalRounds - r),
      });
    }
    previousIds = ids;
  }

  return out;
}

/**
 * Double elimination.
 *
 * The winners bracket is an ordinary single-elimination draw. The losers
 * bracket alternates between two kinds of round:
 *
 *   minor - survivors of the losers bracket pair off with the fresh losers
 *           dropping down from the winners bracket
 *   major - losers-bracket survivors play each other
 *
 * so a team knocked out of the winners bracket always meets someone who has
 * already lost once. The grand final is the two bracket winners; if the losers
 * finalist wins it, they have handed the winners finalist a first loss, so a
 * reset match decides the title.
 */
export function doubleElimMatches(
  teamIds: string[],
  opts: { idPrefix?: string } = {},
): TournamentMatch[] {
  const { idPrefix = "de" } = opts;
  const size = bracketSize(teamIds.length);
  const rounds = Math.log2(size);

  const winners = singleElimMatches(teamIds, { idPrefix: `${idPrefix}-w` });
  const out: TournamentMatch[] = [...winners];

  const wbRound = (r: number) => winners.filter((m) => m.round === r);

  let round = 1;
  /** Ids of the losers-bracket matches whose winners continue. */
  let carry: string[] = [];

  for (let r = 1; r <= rounds - 1; r++) {
    const dropping = wbRound(r); // these matches' losers fall into the LB

    if (r === 1) {
      // First losers round: pair the round-1 losers with each other.
      const ids: string[] = [];
      for (let i = 0; i < dropping.length / 2; i++) {
        const id = `${idPrefix}-l-r${round}-m${i + 1}`;
        ids.push(id);
        out.push({
          id,
          bracket: "losers",
          round,
          a: { from: "loser", matchId: dropping[i * 2].id },
          b: { from: "loser", matchId: dropping[i * 2 + 1].id },
          label: "Losers round 1",
        });
      }
      carry = ids;
      round++;
      continue;
    }

    // Minor round: each carried survivor meets a team dropping from WB round r.
    const minorIds: string[] = [];
    for (let i = 0; i < carry.length; i++) {
      const id = `${idPrefix}-l-r${round}-m${i + 1}`;
      minorIds.push(id);
      out.push({
        id,
        bracket: "losers",
        round,
        a: { from: "winner", matchId: carry[i] },
        // Reverse the drop order so a team does not immediately replay the
        // opponent that knocked them down.
        b: { from: "loser", matchId: dropping[dropping.length - 1 - i].id },
        label: `Losers round ${round}`,
      });
    }
    round++;

    // Major round: pair the minor-round survivors, unless only one remains.
    if (minorIds.length > 1) {
      const majorIds: string[] = [];
      for (let i = 0; i < minorIds.length / 2; i++) {
        const id = `${idPrefix}-l-r${round}-m${i + 1}`;
        majorIds.push(id);
        out.push({
          id,
          bracket: "losers",
          round,
          a: { from: "winner", matchId: minorIds[i * 2] },
          b: { from: "winner", matchId: minorIds[i * 2 + 1] },
          label: `Losers round ${round}`,
        });
      }
      round++;
      carry = majorIds;
    } else {
      carry = minorIds;
    }
  }

  const wbFinal = winners[winners.length - 1];
  const lbFinal = carry[carry.length - 1];

  out.push({
    id: `${idPrefix}-gf`,
    bracket: "final",
    round: round,
    a: { from: "winner", matchId: wbFinal.id },
    b: { from: "winner", matchId: lbFinal },
    label: "Grand final",
  });

  // The reset only gets played if the losers finalist wins the grand final;
  // engine.ts drops it otherwise.
  out.push({
    id: `${idPrefix}-gf-reset`,
    bracket: "final",
    round: round + 1,
    a: { from: "winner", matchId: `${idPrefix}-gf` },
    b: { from: "loser", matchId: `${idPrefix}-gf` },
    label: "Grand final reset",
  });

  return out;
}
