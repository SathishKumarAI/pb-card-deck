/**
 * Tournament types. This file owns the SHAPE of an event and nothing else -
 * no scheduling, no standings, no storage.
 *
 * The one idea worth reading before the rest: a match does not hold two teams,
 * it holds two SLOTS, and a slot says where its team comes from - a seed, the
 * winner of another match, or the loser of another match. Every format in this
 * app is then the same object with different slot wiring, so `recordResult`
 * advances a double-elimination bracket and a pool the same way, and neither
 * needs to know which format it is in.
 */

export type Format =
  | "round-robin"
  | "single-elim"
  | "double-elim"
  | "pools-bracket"
  | "rotating";

/** Fixed pairs all day, or a new partner every round (the social mixer). */
export type EntryMode = "teams" | "rotating";

export interface Player {
  id: string;
  name: string;
  /** Sitting out a round in rotating play, or withdrawn. */
  active?: boolean;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  /** 1 is the strongest. Drives bracket position and pool distribution. */
  seed: number;
}

/** Where a match slot's team comes from. */
export type Slot =
  | { from: "team"; teamId: string }
  | { from: "winner"; matchId: string }
  | { from: "loser"; matchId: string }
  | { from: "bye" };

/** Which part of the event a match belongs to. */
export type Bracket = "rr" | "pool" | "winners" | "losers" | "final";

export interface TournamentMatch {
  id: string;
  bracket: Bracket;
  /** 1-based. Matches in the same round never share a team, so they can all
   *  be on court at once. */
  round: number;
  /** Pool letter for pool play ("A", "B" ...), otherwise undefined. */
  pool?: string;
  a: Slot;
  b: Slot;
  /** Resolved once both slots are known. */
  teamA?: string;
  teamB?: string;
  scoreA?: number;
  scoreB?: number;
  winner?: string;
  /** Court number assigned for this round, 1-based. */
  court?: number;
  /** Set when the match was played through the scorekeeper rather than typed. */
  playedInApp?: boolean;
  completedAt?: number;
  /** Label for a knockout round: "Final", "Semi-final", "Quarter-final"… */
  label?: string;
}

export interface TournamentConfig {
  pointsToWin: number;
  winByTwo: boolean;
  /** Games needed to take a match. 1 for a single game. */
  bestOf: number;
  courts: number;
  /** Pool play only. */
  poolCount?: number;
  /** Pool play only: how many teams from each pool reach the bracket. */
  advancePerPool?: number;
  /** Rotating play only: how many rounds to generate. */
  rounds?: number;
  /** Twist cards available on the scorekeeper for tournament matches. */
  cardsEnabled?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: number;
  format: Format;
  entryMode: EntryMode;
  /** 1 = singles, 2 = doubles. */
  teamSize: number;
  players: Player[];
  teams: Team[];
  matches: TournamentMatch[];
  config: TournamentConfig;
  status: "setup" | "running" | "complete";
  /** Set when the event has a winner. */
  championTeamId?: string;
}

/** A row of the standings table. Computed, never stored. */
export interface StandingRow {
  teamId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  /** Pool letter, when standings are grouped by pool. */
  pool?: string;
  /** 1-based position after sorting and tiebreaks. */
  rank: number;
}

export const FORMAT_INFO: Record<Format, { label: string; blurb: string; minTeams: number }> = {
  "round-robin": {
    label: "Round robin",
    blurb: "Everyone plays everyone. Best for one group of up to about 10 teams.",
    minTeams: 3,
  },
  "pools-bracket": {
    label: "Pools then bracket",
    blurb: "Split into pools, play a mini round robin, then the top teams knock out. The usual shape for a big day.",
    minTeams: 6,
  },
  "single-elim": {
    label: "Single elimination",
    blurb: "Lose once and you are out. The fastest way to find a winner.",
    minTeams: 2,
  },
  "double-elim": {
    label: "Double elimination",
    blurb: "Everyone gets a second life in the losers bracket. Fairest knockout, takes longer.",
    minTeams: 3,
  },
  rotating: {
    label: "Rotating partners",
    blurb: "Players enter alone and get a new partner every round. Scores follow the person, not the pair.",
    minTeams: 4,
  },
};
