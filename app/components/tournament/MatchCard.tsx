"use client";

/**
 * One match, plus the two ways it gets a result: type the score, or play it on
 * the scorekeeper. Owns the score-entry popover; the parent owns what happens
 * to the tournament afterwards.
 */

import { useState } from "react";
import { Play, Check, RotateCcw, MapPin } from "lucide-react";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";

export default function MatchCard({
  tournament,
  match,
  onRecord,
  onPlay,
  onClear,
}: {
  tournament: Tournament;
  match: TournamentMatch;
  onRecord: (scoreA: number, scoreB: number) => void;
  onPlay?: () => void;
  onClear?: () => void;
}) {
  const [entering, setEntering] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const nameOf = (id?: string) => tournament.teams.find((t) => t.id === id)?.name ?? "—";
  const ready = !!match.teamA && !!match.teamB;
  const done = !!match.winner;

  const submit = () => {
    const sa = Number(a);
    const sb = Number(b);
    if (!Number.isFinite(sa) || !Number.isFinite(sb) || sa === sb) return;
    onRecord(sa, sb);
    setEntering(false);
    setA("");
    setB("");
  };

  return (
    <div
      className="mat-thin flex flex-col gap-2 p-3"
      style={{
        border: `1px solid ${done ? "var(--mat-edge)" : ready ? "var(--accent)" : "var(--mat-edge)"}`,
        borderRadius: "var(--r-panel)",
        opacity: ready ? 1 : 0.65,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
          {match.label ?? (match.pool ? `Pool ${match.pool}` : `Round ${match.round}`)}
        </span>
        {match.court && !done && (
          <span className="flex items-center gap-1 text-[11px] font-semibold tnum" style={{ color: "var(--accent)" }}>
            <MapPin size={11} /> Court {match.court}
          </span>
        )}
        {done && (
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
            Final
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Row name={nameOf(match.teamA)} score={match.scoreA} won={done && match.winner === match.teamA} decided={done} />
        <Row name={nameOf(match.teamB)} score={match.scoreB} won={done && match.winner === match.teamB} decided={done} />
      </div>

      {!ready && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Waiting on an earlier match.
        </p>
      )}

      {ready && !done && !entering && (
        <div className="flex gap-2">
          <button
            onClick={() => setEntering(true)}
            className="pressable hover-tint flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
          >
            <Check size={15} /> Enter score
          </button>
          {onPlay && (
            <button
              onClick={onPlay}
              className="cta-accent pressable flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold"
              style={{ borderRadius: "var(--r-ctl)" }}
            >
              <Play size={15} fill="currentColor" /> Play
            </button>
          )}
        </div>
      )}

      {ready && !done && entering && (
        <div className="flex items-center gap-2">
          <ScoreInput label={nameOf(match.teamA)} value={a} onChange={setA} autoFocus />
          <span style={{ color: "var(--text-muted)" }}>–</span>
          <ScoreInput label={nameOf(match.teamB)} value={b} onChange={setB} />
          <button
            onClick={submit}
            disabled={a === "" || b === "" || Number(a) === Number(b)}
            className="cta-accent pressable px-3 py-2 text-sm font-bold disabled:opacity-40"
            style={{ borderRadius: "var(--r-ctl)" }}
          >
            Save
          </button>
          <button onClick={() => setEntering(false)} className="pressable px-2 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Cancel
          </button>
        </div>
      )}

      {done && onClear && (
        <button
          onClick={onClear}
          className="pressable hover-tint self-start flex items-center gap-1.5 px-2 py-1 text-xs font-medium"
          style={{ color: "var(--text-muted)", borderRadius: "var(--r-chip)" }}
        >
          <RotateCcw size={12} /> Undo result
        </button>
      )}
    </div>
  );
}

function Row({ name, score, won, decided }: { name: string; score?: number; won: boolean; decided: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-sm truncate"
        style={{ color: decided && !won ? "var(--text-muted)" : "var(--text)", fontWeight: won ? 700 : 500 }}
      >
        {name}
      </span>
      <span className="tnum text-base font-bold shrink-0" style={{ color: won ? "var(--accent)" : "var(--text-muted)" }}>
        {typeof score === "number" ? score : "–"}
      </span>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      autoFocus={autoFocus}
      aria-label={`Score for ${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="tnum w-14 px-2 py-2 text-center outline-none"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
    />
  );
}
