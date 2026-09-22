"use client";

/**
 * The tournament tab: the saved-events list, the setup form, and the running
 * event. Owns which of the three is on screen and all persistence, so page.tsx
 * stays the game and never grows a second app inside it.
 */

import { useEffect, useState } from "react";
import { Plus, Trophy, Trash2, CalendarDays } from "lucide-react";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { FORMAT_INFO } from "@/lib/tournament/types";
import { progress, assignCourts } from "@/lib/tournament/engine";
import { listTournaments, saveTournament, deleteTournament } from "@/lib/client-api";
import TournamentSetup from "./TournamentSetup";
import TournamentScreen from "./TournamentScreen";

export default function TournamentHome({
  active,
  onActiveChange,
  onPlayMatch,
}: {
  active: Tournament | null;
  onActiveChange: (t: Tournament | null) => void;
  onPlayMatch: (t: Tournament, m: TournamentMatch) => void;
}) {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [creating, setCreating] = useState(false);

  /** Opening a stored event re-runs court assignment, so a saved schedule
   *  picks up a fixed or changed court layout instead of keeping the numbers
   *  it was written with. */
  const open = (t: Tournament) => onActiveChange(assignCourts(t));

  useEffect(() => {
    if (!active && !creating) setEvents(listTournaments());
  }, [active, creating]);

  /** Every change to a running event is written straight through. */
  const update = (t: Tournament) => {
    saveTournament(t);
    onActiveChange(t);
  };

  if (creating) {
    return (
      <TournamentSetup
        onCancel={() => setCreating(false)}
        onCreate={(t) => {
          saveTournament(t);
          setCreating(false);
          onActiveChange(t);
        }}
      />
    );
  }

  if (active) {
    return (
      <TournamentScreen
        tournament={active}
        onChange={update}
        onExit={() => onActiveChange(null)}
        onPlayMatch={(m) => onPlayMatch(active, m)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setCreating(true)}
        className="cta-accent pressable flex items-center justify-between gap-3 px-5 py-4 text-left"
        style={{ borderRadius: "var(--r-panel)" }}
      >
        <span className="flex items-center gap-3">
          <Plus size={20} className="shrink-0" />
          <span>
            <span className="block text-base font-bold leading-tight">New tournament</span>
            <span className="block text-xs opacity-75">Round robin, pools, or a knockout bracket</span>
          </span>
        </span>
      </button>

      {events.length === 0 ? (
        <div
          className="mat-thin flex flex-col items-center gap-2 px-6 py-10 text-center"
          style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
        >
          <Trophy size={28} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No events yet</p>
          <p className="text-sm max-w-[28ch]" style={{ color: "var(--text-muted)" }}>
            Paste your player list, pick a format, and the app builds the schedule, the standings and the bracket.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="eyebrow px-0.5">Your events</span>
          {events.map((t) => {
            const { played, total } = progress(t);
            const champion = t.teams.find((x) => x.id === t.championTeamId);
            return (
              <div
                key={t.id}
                className="mat-thin hoverable flex items-center gap-3 p-3"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
              >
                <button onClick={() => open(t)} className="pressable flex items-center gap-3 flex-1 min-w-0 text-left">
                  <span
                    className="flex items-center justify-center w-10 h-10 shrink-0"
                    style={{
                      background: t.status === "complete" ? "color-mix(in srgb, var(--yellow) 22%, transparent)" : "var(--bg-elevated)",
                      color: t.status === "complete" ? "var(--yellow)" : "var(--accent)",
                      borderRadius: "var(--r-ctl)",
                    }}
                  >
                    {t.status === "complete" ? <Trophy size={18} /> : <CalendarDays size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{t.name}</span>
                    <span className="block text-xs truncate tnum" style={{ color: "var(--text-muted)" }}>
                      {FORMAT_INFO[t.format].label} · {played}/{total} played
                      {champion ? ` · won by ${champion.name}` : ""}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
                    deleteTournament(t.id);
                    setEvents(listTournaments());
                  }}
                  aria-label={`Delete ${t.name}`}
                  className="pressable p-2 rounded-full shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
