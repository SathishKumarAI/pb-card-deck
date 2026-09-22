"use client";

import { GameSession, logCount } from "@/lib/game";
import { Timer, Flag, Download, CircleDot } from "lucide-react";

// In-match officiating controls for coach/umpire "Track a match" mode: the
// serving status card (who's up + server 1/2 + what a fault does), per-team
// timeout + fault buttons, and a one-tap match-sheet download. Recording the
// rally itself (WON/LOST) lives on the scoreboard. Pure UI - all state changes
// go through the passed handlers (pure game engine).
export default function OfficialControls({
  game,
  onTimeout,
  onFault,
  onDownload,
}: {
  game: GameSession;
  onTimeout: (team: 1 | 2) => void;
  onFault: (team: 1 | 2) => void;
  onDownload: () => void;
}) {
  const servingName = game.servingTeam === 1 ? game.playerNames.team1 : game.playerNames.team2;
  const otherName = game.servingTeam === 1 ? game.playerNames.team2 : game.playerNames.team1;
  const isDoubles = game.config.gameType !== "singles";
  const toSecondServer = isDoubles && game.serverNumber === 1;
  const ordinal = game.serverNumber === 1 ? "1st" : "2nd";
  const nextOnFault = toSecondServer
    ? `Fault → 2nd server (still ${servingName})`
    : `Fault → side out to ${otherName}`;

  return (
    <div className="w-full max-w-sm flex flex-col gap-2.5">
      {/* Serving status card - who's up + which server + what a fault does */}
      <div
        className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl self-stretch"
        role="status"
        aria-live="polite"
        style={{ background: "var(--bg-elevated)", color: "var(--text)", border: "1px solid var(--accent)" }}
      >
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <CircleDot size={15} style={{ color: "var(--yellow)" }} /> {servingName} serving
        </span>
        {isDoubles && (
          <>
            <span className="flex items-center gap-2">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={
                    n === game.serverNumber
                      ? { background: "var(--yellow)", color: "#000" }
                      : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: n === game.serverNumber ? "#000" : "var(--text-muted)" }} />
                  {n === 1 ? "1st" : "2nd"} server
                </span>
              ))}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {ordinal} server up · {nextOnFault}
            </span>
          </>
        )}
        {!isDoubles && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Singles · fault = side out</span>}
      </div>

      {!game.config.sideOutScoring && (
        <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
          Rally scoring: tap whichever team won the rally to add their point.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {([1, 2] as const).map((team) => (
          <div key={team} className="glass rounded-xl p-2.5 flex flex-col gap-2" style={{ border: "1px solid var(--border)" }}>
            <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
              {team === 1 ? game.playerNames.team1 : game.playerNames.team2}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onTimeout(team)}
                className="pressable flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                aria-label={`Record timeout for ${team === 1 ? game.playerNames.team1 : game.playerNames.team2}`}
              >
                <Timer size={15} /> TO {logCount(game, "timeout", team)}
              </button>
              <button
                onClick={() => onFault(team)}
                className="pressable flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                aria-label={`Record fault for ${team === 1 ? game.playerNames.team1 : game.playerNames.team2}`}
              >
                <Flag size={15} /> Fault {logCount(game, "fault", team)}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDownload}
        className="pressable flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        <Download size={15} /> Download match sheet
      </button>
    </div>
  );
}
