"use client";

/**
 * The draw, drawn as a tree.
 *
 * This is the one screen where the shape IS the information, so it is not a
 * list of matches: rounds are columns, each match sits vertically centred
 * between the two it feeds from, and an SVG elbow connects them - the same
 * picture a tournament desk pins to the wall.
 *
 * Geometry lives here, not in CSS grid, because a bracket's vertical rhythm
 * doubles every round (2 slots, then 4, then 8) and the connectors have to
 * land on the exact centre of a box. Absolute positions computed from one
 * constant are simpler to reason about than nested flex, and they give the
 * connectors something to aim at.
 */

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";

/** One box in the tree, positioned in bracket space. */
interface Node {
  match: TournamentMatch;
  col: number;
  /** Centre line of the box, in "slot" units - 1 slot = one first-round match. */
  centre: number;
}

const BOX_H = 62;      // height of a match box
const SLOT_H = 78;     // vertical pitch of a first-round match
const COL_W = 196;     // column width
const COL_GAP = 46;    // horizontal gap for the connector elbow

export default function BracketView({
  tournament,
  onPick,
}: {
  tournament: Tournament;
  onPick?: (m: TournamentMatch) => void;
}) {
  const bands = useMemo(() => {
    const live = tournament.matches.filter((m) => !(m.a.from === "bye" || m.b.from === "bye"));
    const of = (b: string) => live.filter((m) => m.bracket === b);
    return [
      { key: "winners", label: tournament.format === "double-elim" ? "Winners bracket" : "Bracket", matches: of("winners") },
      { key: "losers", label: "Losers bracket", matches: of("losers") },
      { key: "final", label: "Grand final", matches: of("final") },
    ].filter((b) => b.matches.length > 0);
  }, [tournament]);

  if (bands.length === 0) {
    return (
      <div
        className="mat-thin flex flex-col items-center gap-2 px-6 py-12 text-center"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
      >
        <Trophy size={26} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No bracket yet</p>
        <p className="text-sm max-w-[32ch]" style={{ color: "var(--text-muted)" }}>
          {tournament.format === "pools-bracket"
            ? "It is drawn the moment the last pool match is scored, with the qualifiers seeded into it."
            : "This format has no knockout stage. The standings decide it."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Scores appear as they are entered; a decided line turns green. Drag sideways to follow the draw.
      </p>

      {bands.map((band) => (
        <Band key={band.key} tournament={tournament} label={band.label} matches={band.matches} onPick={onPick} />
      ))}
    </div>
  );
}

function Band({
  tournament,
  label,
  matches,
  onPick,
}: {
  tournament: Tournament;
  label: string;
  matches: TournamentMatch[];
  onPick?: (m: TournamentMatch) => void;
}) {
  const rounds = useMemo(() => [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b), [matches]);

  /**
   * Lay the tree out. A first-round match takes one slot; every later match
   * centres on the average of the two it feeds from, which is what produces a
   * bracket's doubling rhythm without hard-coding it per round.
   */
  const nodes = useMemo(() => {
    const placed = new Map<string, Node>();
    rounds.forEach((round, col) => {
      const inRound = matches.filter((m) => m.round === round);
      inRound.forEach((match, i) => {
        const feeders = [match.a, match.b]
          .map((s) => (s.from === "winner" || s.from === "loser" ? placed.get(s.matchId) : undefined))
          .filter(Boolean) as Node[];
        const centre = feeders.length
          ? feeders.reduce((sum, f) => sum + f.centre, 0) / feeders.length
          : i + 0.5;
        placed.set(match.id, { match, col, centre });
      });
    });
    return [...placed.values()];
  }, [matches, rounds]);

  const maxCentre = Math.max(...nodes.map((n) => n.centre), 1);
  const height = (maxCentre + 0.6) * SLOT_H;
  const width = rounds.length * COL_W + (rounds.length - 1) * COL_GAP;
  const nameOf = (id?: string) => tournament.teams.find((t) => t.id === id)?.name;
  const xOf = (col: number) => col * (COL_W + COL_GAP);
  const yOf = (centre: number) => centre * SLOT_H - BOX_H / 2;

  return (
    <section className="flex flex-col gap-2">
      <span className="eyebrow px-0.5">{label}</span>
      <div className="scroll-area overflow-x-auto pb-2">
        <div
          className="relative"
          style={{ width, height }}
        >
          {/* Connectors first, so boxes sit on top of them */}
          <svg width={width} height={height} className="absolute inset-0" aria-hidden>
            {nodes.map((node) =>
              [node.match.a, node.match.b].map((slot, side) => {
                if (slot.from !== "winner" && slot.from !== "loser") return null;
                const from = nodes.find((n) => n.match.id === slot.matchId);
                if (!from) return null;
                const x1 = xOf(from.col) + COL_W;
                const y1 = from.centre * SLOT_H;
                const x2 = xOf(node.col);
                const y2 = node.centre * SLOT_H;
                const mid = x1 + COL_GAP / 2;
                const decided = !!from.match.winner;
                return (
                  <path
                    key={`${node.match.id}-${side}`}
                    d={`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`}
                    fill="none"
                    stroke={decided ? "var(--accent)" : "var(--mat-edge)"}
                    strokeWidth={decided ? 1.5 : 1}
                    opacity={decided ? 0.55 : 1}
                  />
                );
              }),
            )}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.match.id}
              className="absolute"
              style={{ left: xOf(node.col), top: yOf(node.centre), width: COL_W, height: BOX_H }}
            >
              <MatchBox
                match={node.match}
                nameA={nameOf(node.match.teamA)}
                nameB={nameOf(node.match.teamB)}
                onPick={onPick}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MatchBox({
  match,
  nameA,
  nameB,
  onPick,
}: {
  match: TournamentMatch;
  nameA?: string;
  nameB?: string;
  onPick?: (m: TournamentMatch) => void;
}) {
  const done = !!match.winner;
  const ready = !!match.teamA && !!match.teamB;
  const clickable = !!onPick && ready;

  return (
    <button
      onClick={() => clickable && onPick?.(match)}
      disabled={!clickable}
      title={match.label ?? undefined}
      className="mat-thin w-full h-full flex flex-col justify-center gap-0.5 px-2.5 py-1.5 text-left disabled:cursor-default enabled:hover:border-[var(--accent)] transition-colors"
      style={{
        border: `1px solid ${done ? "var(--mat-edge)" : ready ? "var(--accent)" : "var(--mat-edge)"}`,
        borderRadius: "var(--r-ctl)",
        opacity: ready ? 1 : 0.6,
      }}
    >
      <Side name={nameA} score={match.scoreA} won={done && match.winner === match.teamA} decided={done} />
      <Side name={nameB} score={match.scoreB} won={done && match.winner === match.teamB} decided={done} />
    </button>
  );
}

function Side({ name, score, won, decided }: { name?: string; score?: number; won: boolean; decided: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span
        className="text-[13px] truncate"
        style={{
          color: !name ? "var(--text-muted)" : decided && !won ? "var(--text-muted)" : "var(--text)",
          fontWeight: won ? 700 : 500,
        }}
      >
        {name ?? "—"}
      </span>
      <span
        className="tnum text-[13px] shrink-0 font-semibold"
        style={{ color: won ? "var(--accent)" : "var(--text-muted)" }}
      >
        {typeof score === "number" ? score : ""}
      </span>
    </span>
  );
}
