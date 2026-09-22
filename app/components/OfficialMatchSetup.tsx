"use client";

import { useState } from "react";
import { ClipboardCheck, Users, User, Trophy, Layers } from "lucide-react";
import { GameType } from "@/lib/game";

export interface OfficialMatchOptions {
  team1: string;
  team2: string;
  gameType: GameType;
  pointsToWin: number;
  bestOf: number;
  eventLabel: string;
  cardsEnabled: boolean;
  /* true = traditional side-out (only the serving team scores);
     false = rally scoring (whoever wins the rally scores). */
  sideOutScoring: boolean;
}

// Setup screen for the coach / umpire "Track a match" flow. Captures the
// officiating context (format, players, event, target score, cards on/off)
// before a real match starts. Local-first: nothing leaves the device.
export default function OfficialMatchSetup({ onStart }: { onStart: (opts: OfficialMatchOptions) => void }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [gameType, setGameType] = useState<GameType>("doubles");
  const [pointsToWin, setPointsToWin] = useState(11);
  const [bestOf, setBestOf] = useState(1);
  const [eventLabel, setEventLabel] = useState("");
  const [cardsEnabled, setCardsEnabled] = useState(false);
  const [sideOutScoring, setSideOutScoring] = useState(true);

  const start = () =>
    onStart({
      team1: team1.trim() || "Team 1",
      team2: team2.trim() || "Team 2",
      gameType,
      pointsToWin,
      bestOf,
      eventLabel: eventLabel.trim(),
      cardsEnabled,
      sideOutScoring,
    });

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  } as const;

  return (
    <div className="w-full flex flex-col gap-4 anim-fade-up">
      <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: "1px solid var(--accent)" }}>
        <span style={{ color: "var(--accent)" }}><ClipboardCheck size={22} /></span>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text)" }}>Track a match.</strong> Run and record a real match - scoring,
          server rotation, timeouts and faults. Saves to Match history with an exportable match sheet.
        </p>
      </div>

      {/* Format */}
      <Field label="Format">
        <div className="grid grid-cols-2 gap-2">
          {([["singles", "Singles", User], ["doubles", "Doubles", Users]] as const).map(([val, label, Icon]) => (
            <button
              key={val}
              onClick={() => setGameType(val)}
              className="pressable flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={gameType === val ? { background: "var(--accent)", color: "var(--accent-ink)" } : inputStyle}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Players / teams */}
      <Field label={gameType === "singles" ? "Players" : "Teams"}>
        <div className="flex flex-col gap-2">
          <input
            value={team1}
            onChange={(e) => setTeam1(e.target.value)}
            placeholder={gameType === "singles" ? "Player 1" : "Team 1"}
            maxLength={40}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <input
            value={team2}
            onChange={(e) => setTeam2(e.target.value)}
            placeholder={gameType === "singles" ? "Player 2" : "Team 2"}
            maxLength={40}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </Field>

      {/* Event label */}
      <Field label="Event / round (optional)">
        <input
          value={eventLabel}
          onChange={(e) => setEventLabel(e.target.value)}
          placeholder="e.g. Club Ladder - QF"
          maxLength={60}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle}
        />
      </Field>

      {/* Scoring style */}
      <Field label="Scoring">
        <div className="grid grid-cols-2 gap-2">
          {([[true, "Side-out", "only server scores"], [false, "Rally", "every point counts"]] as const).map(([val, label, hint]) => (
            <button
              key={label}
              onClick={() => setSideOutScoring(val)}
              className="pressable flex flex-col items-center py-2 rounded-xl text-sm font-semibold"
              style={sideOutScoring === val ? { background: "var(--accent)", color: "var(--accent-ink)" } : inputStyle}
            >
              {label}
              <span className="text-[10px] font-normal opacity-80">{hint}</span>
            </button>
          ))}
        </div>
      </Field>

      {/* Points to win */}
      <Field label="Points to win">
        <div className="grid grid-cols-3 gap-2">
          {[11, 15, 21].map((p) => (
            <button
              key={p}
              onClick={() => setPointsToWin(p)}
              className="pressable py-2.5 rounded-xl text-sm font-semibold"
              style={pointsToWin === p ? { background: "var(--accent)", color: "var(--accent-ink)" } : inputStyle}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>

      {/* Match length */}
      <Field label="Match length">
        <div className="grid grid-cols-3 gap-2">
          {([[1, "Single"], [3, "Best of 3"], [5, "Best of 5"]] as const).map(([n, label]) => (
            <button
              key={n}
              onClick={() => setBestOf(n)}
              className="pressable py-2.5 rounded-xl text-xs font-semibold"
              style={bestOf === n ? { background: "var(--accent)", color: "var(--accent-ink)" } : inputStyle}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Cards toggle */}
      <button
        onClick={() => setCardsEnabled((v) => !v)}
        className="pressable flex items-center justify-between gap-3 p-3 rounded-xl"
        style={inputStyle}
        role="switch"
        aria-checked={cardsEnabled}
      >
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <Layers size={16} /> Allow twist cards
        </span>
        <span className="relative w-10 h-6 rounded-full transition-colors" style={{ background: cardsEnabled ? "var(--accent)" : "var(--border)" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: cardsEnabled ? "1.125rem" : "0.125rem" }} />
        </span>
      </button>

      <button
        onClick={start}
        className="pressable w-full flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-full"
        style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
      >
        <Trophy size={18} /> Start match
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow px-0.5">{label}</span>
      {children}
    </div>
  );
}
