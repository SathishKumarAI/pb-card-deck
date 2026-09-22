"use client";

/**
 * The bracket, drawn as rounds in columns.
 *
 * A bracket is the one screen where a phone cannot win by stacking: the shape
 * IS the information. So it scrolls sideways with each round a fixed-width
 * column, snapping between rounds on touch, and the losers bracket sits under
 * the winners bracket as its own band rather than being interleaved.
 */

import type { Tournament, TournamentMatch } from "@/lib/tournament/types";

export default function BracketView({
  tournament,
  onPick,
}: {
  tournament: Tournament;
  onPick?: (m: TournamentMatch) => void;
}) {
  const bands: { key: string; label: string; matches: TournamentMatch[] }[] = [
    { key: "winners", label: tournament.format === "double-elim" ? "Winners bracket" : "Bracket", matches: [] },
    { key: "losers", label: "Losers bracket", matches: [] },
    { key: "final", label: "Grand final", matches: [] },
  ];
  for (const m of tournament.matches) {
    const band = bands.find((b) => b.key === m.bracket);
    if (band) band.matches.push(m);
  }

  const live = new Set(
    tournament.matches
      .filter((m) => !(m.a.from === "bye" || m.b.from === "bye"))
      .map((m) => m.id),
  );

  const nameOf = (id?: string) => tournament.teams.find((t) => t.id === id)?.name;

  if (!bands.some((b) => b.matches.length)) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        The bracket appears once pool play is done.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {bands
        .filter((b) => b.matches.some((m) => live.has(m.id)))
        .map((band) => {
          const rounds = [...new Set(band.matches.map((m) => m.round))].sort((a, b) => a - b);
          return (
            <section key={band.key} className="flex flex-col gap-2">
              <span className="eyebrow px-0.5">{band.label}</span>
              <div className="flex gap-3 overflow-x-auto scroll-area pb-2 snap-x">
                {rounds.map((round) => {
                  const matches = band.matches.filter((m) => m.round === round && live.has(m.id));
                  if (!matches.length) return null;
                  return (
                    <div key={round} className="shrink-0 w-[15rem] snap-start flex flex-col gap-2">
                      <span className="text-xs font-semibold px-0.5" style={{ color: "var(--text-muted)" }}>
                        {matches[0].label ?? `Round ${round}`}
                      </span>
                      <div className="flex flex-col gap-2 justify-around flex-1">
                        {matches.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => onPick?.(m)}
                            disabled={!onPick || !m.teamA || !m.teamB}
                            className="mat-thin hoverable pressable w-full p-2 text-left disabled:opacity-60 disabled:cursor-default"
                            style={{
                              border: `1px solid ${m.winner ? "var(--mat-edge)" : "var(--accent)"}`,
                              borderRadius: "var(--r-ctl)",
                            }}
                          >
                            <Side
                              name={nameOf(m.teamA) ?? "—"}
                              score={m.scoreA}
                              won={!!m.winner && m.winner === m.teamA}
                              decided={!!m.winner}
                            />
                            <span className="block h-px my-1" style={{ background: "var(--mat-edge)" }} />
                            <Side
                              name={nameOf(m.teamB) ?? "—"}
                              score={m.scoreB}
                              won={!!m.winner && m.winner === m.teamB}
                              decided={!!m.winner}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function Side({ name, score, won, decided }: { name: string; score?: number; won: boolean; decided: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span
        className="text-sm truncate"
        style={{
          color: decided && !won ? "var(--text-muted)" : "var(--text)",
          fontWeight: won ? 700 : 500,
        }}
      >
        {name}
      </span>
      <span className="tnum text-sm shrink-0" style={{ color: won ? "var(--accent)" : "var(--text-muted)" }}>
        {typeof score === "number" ? score : ""}
      </span>
    </span>
  );
}
