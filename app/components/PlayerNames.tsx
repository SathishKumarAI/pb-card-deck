"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export default function PlayerNames({
  names,
  onSave,
}: {
  names: { team1: string; team2: string };
  onSave: (names: { team1: string; team2: string }) => void;
}) {
  const [team1, setTeam1] = useState(names.team1);
  const [team2, setTeam2] = useState(names.team2);

  const save = () =>
    onSave({ team1: team1.trim() || "Team 1", team2: team2.trim() || "Team 2" });

  const input = "text-sm px-3 py-1.5 rounded-lg w-28 outline-none focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" } as const;

  return (
    <div className="anim-pop glass flex items-center gap-2 rounded-xl px-4 py-3" style={{ border: "1px solid var(--border)" }}>
      <input value={team1} onChange={(e) => setTeam1(e.target.value)} aria-label="Team 1 name" placeholder="Team 1" maxLength={20} className={input} style={inputStyle} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>vs</span>
      <input value={team2} onChange={(e) => setTeam2(e.target.value)} aria-label="Team 2 name" placeholder="Team 2" maxLength={20} className={input} style={inputStyle} />
      <button onClick={save} className="pressable flex items-center gap-1 px-3 py-1.5 text-xs rounded-full" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
        <Check size={14} /> Save
      </button>
    </div>
  );
}
