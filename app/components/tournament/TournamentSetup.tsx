"use client";

/**
 * Creating an event. Owns the form only - the schedule is built by
 * lib/tournament/engine.createTournament once this hands over.
 *
 * The design problem here is 50 people standing on a court waiting. So entry is
 * one paste of names, not 50 taps: a line is either a player ("Sam") or an
 * already-formed pair ("Sam & Priya"), and the pairing strategy handles the
 * rest.
 */

import { useMemo, useState } from "react";
import { ArrowLeft, Users, Trophy, Shuffle, Sparkles, Layers, Check } from "lucide-react";
import { FORMAT_INFO, type Format, type EntryMode } from "@/lib/tournament/types";
import { createTournament, DEFAULT_CONFIG } from "@/lib/tournament/engine";
import type { Tournament } from "@/lib/tournament/types";

const FORMAT_ICON: Record<Format, typeof Trophy> = {
  "round-robin": Users,
  "pools-bracket": Layers,
  "single-elim": Trophy,
  "double-elim": Trophy,
  rotating: Shuffle,
};

type Pairing = "sequential" | "random" | "snake";

const PAIRING_INFO: { key: Pairing; label: string; blurb: string }[] = [
  { key: "sequential", label: "As listed", blurb: "1st with 2nd, 3rd with 4th" },
  { key: "random", label: "Random", blurb: "Shuffle, then pair" },
  { key: "snake", label: "Balanced", blurb: "Strongest with weakest" },
];

/** A line is a pair if it holds a separator; otherwise it is one player. */
function parseEntries(text: string): { players: string[]; pairs: string[][] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const pairs: string[][] = [];
  const players: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s*(?:&|\+|\/|,| and )\s*/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) pairs.push(parts.slice(0, 2));
    else players.push(parts[0]);
  }
  return { players, pairs };
}

function buildTeams(players: string[], pairs: string[][], teamSize: number, pairing: Pairing) {
  const teams = pairs.map((p) => ({ name: p.join(" + "), playerNames: p }));
  const rest = [...players];

  if (teamSize === 1) {
    return [...teams, ...rest.map((p) => ({ name: p, playerNames: [p] }))];
  }

  if (pairing === "random") {
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
  }

  if (pairing === "snake") {
    // Strongest with weakest, assuming the list is entered best-first.
    const out: { name: string; playerNames: string[] }[] = [];
    while (rest.length > 1) {
      const a = rest.shift()!;
      const b = rest.pop()!;
      out.push({ name: `${a} + ${b}`, playerNames: [a, b] });
    }
    if (rest.length) out.push({ name: rest[0], playerNames: [rest[0]] });
    return [...teams, ...out];
  }

  for (let i = 0; i < rest.length; i += 2) {
    const pair = rest.slice(i, i + 2);
    teams.push({ name: pair.join(" + "), playerNames: pair });
  }
  return teams;
}

export default function TournamentSetup({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (t: Tournament) => void;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("pools-bracket");
  const [teamSize, setTeamSize] = useState(2);
  const [pairing, setPairing] = useState<Pairing>("sequential");
  const [text, setText] = useState("");
  const [courts, setCourts] = useState(2);
  const [pointsToWin, setPointsToWin] = useState(11);
  const [poolCount, setPoolCount] = useState(4);
  const [advancePerPool, setAdvancePerPool] = useState(2);
  const [rounds, setRounds] = useState(5);
  const [cardsEnabled, setCardsEnabled] = useState(false);

  const entryMode: EntryMode = format === "rotating" ? "rotating" : "teams";
  const parsed = useMemo(() => parseEntries(text), [text]);
  const teams = useMemo(
    () => (entryMode === "rotating" ? [] : buildTeams(parsed.players, parsed.pairs, teamSize, pairing)),
    [parsed, teamSize, pairing, entryMode],
  );
  const playerCount = parsed.players.length + parsed.pairs.flat().length;
  const enough = entryMode === "rotating" ? playerCount >= 4 : teams.length >= FORMAT_INFO[format].minTeams;

  const create = () => {
    const players =
      entryMode === "rotating"
        ? [...parsed.players, ...parsed.pairs.flat()].map((n) => ({ name: n }))
        : teams.flatMap((t) => t.playerNames).map((n) => ({ name: n }));

    onCreate(
      createTournament({
        name: name || "Tournament",
        format,
        entryMode,
        teamSize: entryMode === "rotating" ? 2 : teamSize,
        players,
        teams,
        config: {
          ...DEFAULT_CONFIG,
          courts,
          pointsToWin,
          poolCount,
          advancePerPool,
          rounds,
          cardsEnabled,
        },
      }),
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <button onClick={onCancel} className="pressable self-start flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="font-display text-3xl font-black leading-tight" style={{ color: "var(--text)" }}>
          New tournament
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          Names in, format chosen, schedule out. Everything stays on this device.
        </p>
      </div>

      <Field label="Event name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Saturday Social"
          className="w-full px-3.5 py-3 outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
        />
      </Field>

      <Field label="Format">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(FORMAT_INFO) as Format[]).map((f) => {
            const Icon = FORMAT_ICON[f];
            const active = format === f;
            return (
              <button
                key={f}
                onClick={() => setFormat(f)}
                aria-pressed={active}
                className={`pressable ${active ? "" : "hoverable mat-thin"} flex gap-3 p-3.5 text-left`}
                style={{
                  border: `1px solid ${active ? "var(--accent)" : "var(--mat-edge)"}`,
                  borderRadius: "var(--r-panel)",
                  background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : undefined,
                }}
              >
                <Icon size={18} className="shrink-0 mt-0.5" style={{ color: active ? "var(--accent)" : "var(--text-muted)" }} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>{FORMAT_INFO[f].label}</span>
                  <span className="block text-xs leading-snug mt-0.5" style={{ color: "var(--text-muted)" }}>{FORMAT_INFO[f].blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {entryMode === "teams" && (
        <Field label="Playing as">
          <Segmented
            options={[
              { value: 2, label: "Doubles" },
              { value: 1, label: "Singles" },
            ]}
            value={teamSize}
            onChange={setTeamSize}
          />
        </Field>
      )}

      <Field
        label={entryMode === "rotating" ? "Players" : teamSize === 1 ? "Players" : "Players or pairs"}
        hint={
          entryMode === "rotating"
            ? "One name per line. Partners change every round."
            : teamSize === 1
              ? "One name per line."
              : "One per line. Write a pair as “Sam & Priya” to keep them together."
        }
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={"Sam\nPriya\nAlex & Jo\nRavi\nMei"}
          className="w-full px-3.5 py-3 outline-none resize-y"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)", lineHeight: 1.6 }}
        />
        <p className="mt-2 text-xs tnum" style={{ color: playerCount ? "var(--accent)" : "var(--text-muted)" }}>
          {playerCount} player{playerCount === 1 ? "" : "s"}
          {entryMode === "teams" && ` · ${teams.length} team${teams.length === 1 ? "" : "s"}`}
          {!enough && playerCount > 0 && (
            <span style={{ color: "var(--yellow)" }}>
              {" "}· need at least {entryMode === "rotating" ? 4 : FORMAT_INFO[format].minTeams}
            </span>
          )}
        </p>
      </Field>

      {entryMode === "teams" && teamSize === 2 && parsed.players.length > 1 && (
        <Field label="Pair the unpaired names">
          <div className="flex flex-wrap gap-1.5">
            {PAIRING_INFO.map((p) => (
              <button
                key={p.key}
                onClick={() => setPairing(p.key)}
                aria-pressed={pairing === p.key}
                title={p.blurb}
                className="pressable px-3 py-2 text-sm font-medium"
                style={
                  pairing === p.key
                    ? { background: "var(--accent)", color: "var(--accent-ink)", borderRadius: "var(--r-chip)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {teams.length > 0 && (
        <Field label="Teams" hint="Seeded in this order. The list is the draw.">
          <ol className="flex flex-col gap-1 max-h-56 overflow-y-auto scroll-area pr-1">
            {teams.map((t, i) => (
              <li
                key={`${t.name}-${i}`}
                className="mat-thin flex items-center gap-2.5 px-3 py-2 text-sm"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
              >
                <span className="tnum text-xs w-5 shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                <span className="truncate">{t.name}</span>
              </li>
            ))}
          </ol>
        </Field>
      )}

      <Field label="Courts" hint="How many games can run at once.">
        <Segmented options={[1, 2, 3, 4, 6, 8].map((n) => ({ value: n, label: String(n) }))} value={courts} onChange={setCourts} />
      </Field>

      <Field label="Points to win">
        <Segmented options={[11, 15, 21].map((n) => ({ value: n, label: String(n) }))} value={pointsToWin} onChange={setPointsToWin} />
      </Field>

      {format === "pools-bracket" && (
        <>
          <Field label="Pools">
            <Segmented options={[2, 3, 4, 6, 8].map((n) => ({ value: n, label: String(n) }))} value={poolCount} onChange={setPoolCount} />
          </Field>
          <Field label="Advance from each pool">
            <Segmented options={[1, 2, 4].map((n) => ({ value: n, label: String(n) }))} value={advancePerPool} onChange={setAdvancePerPool} />
          </Field>
        </>
      )}

      {format === "rotating" && (
        <Field label="Rounds" hint="You can add more while you play.">
          <Segmented options={[3, 5, 7, 10].map((n) => ({ value: n, label: String(n) }))} value={rounds} onChange={setRounds} />
        </Field>
      )}

      <button
        onClick={() => setCardsEnabled(!cardsEnabled)}
        role="switch"
        aria-checked={cardsEnabled}
        className="mat-thin hoverable pressable flex items-center justify-between gap-3 p-3.5"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
      >
        <span className="flex items-center gap-2.5 min-w-0 text-left">
          <Sparkles size={17} className="shrink-0" style={{ color: "var(--accent)" }} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Twist cards in matches</span>
            <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Off for serious play, on for a social day</span>
          </span>
        </span>
        <span className="relative w-11 h-6 rounded-full shrink-0 transition-colors" style={{ background: cardsEnabled ? "var(--accent)" : "var(--border)" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: cardsEnabled ? "1.375rem" : "0.125rem" }} />
        </span>
      </button>

      <button
        onClick={create}
        disabled={!enough}
        className="cta-accent pressable flex items-center justify-center gap-2 px-6 py-4 font-bold disabled:opacity-40"
        style={{ borderRadius: "var(--r-panel)" }}
      >
        <Check size={18} /> Create schedule
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="eyebrow">{label}</span>
        {hint && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mat-thin flex gap-1 p-1" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className="pressable flex-1 px-2 py-2 rounded-full text-sm font-semibold transition-colors"
          style={value === o.value ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--text-secondary)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
