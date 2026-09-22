"use client";

import { GameSession } from "@/lib/game";
import { X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

// Big courtside / cast display (backlog F072): huge tappable scores, minimal
// chrome, for a phone or tablet propped at the side of the court.
export default function TVScore({
  game,
  onScore,
  onExit,
}: {
  game: GameSession;
  onScore: (team: 1 | 2) => void;
  onExit: () => void;
}) {
  useScrollLock(true);
  const locked = game.config.scoreLocked || !!game.winner;
  // Server 1/2 only rotates in official doubles - show it there so a courtside
  // viewer sees which server is up, matching the main scoreboard.
  const officialDoubles = game.config.gameType !== "singles" && !!game.config.officialMode;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex justify-between items-center px-5" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Game {game.gameNumber}
        </span>
        <button
          onClick={onExit}
          aria-label="Exit big-score view"
          className="pressable p-2 rounded-full"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-2 p-3">
        <TeamSide
          name={game.playerNames.team1}
          score={game.score.team1}
          color="var(--blue)"
          serving={game.servingTeam === 1}
          serverNumber={game.serverNumber}
          showServer={officialDoubles}
          disabled={locked}
          onClick={() => onScore(1)}
        />
        <TeamSide
          name={game.playerNames.team2}
          score={game.score.team2}
          color="var(--red)"
          serving={game.servingTeam === 2}
          serverNumber={game.serverNumber}
          showServer={officialDoubles}
          disabled={locked}
          onClick={() => onScore(2)}
        />
      </div>

      <p className="text-center text-xs pb-4" style={{ color: "var(--text-muted)" }}>
        Tap a side to score{game.config.scoreLocked ? " (locked)" : ""}
      </p>
    </div>
  );
}

function TeamSide({ name, score, color, serving, serverNumber, showServer, disabled, onClick }: {
  name: string; score: number; color: string; serving: boolean; serverNumber: 1 | 2; showServer: boolean; disabled: boolean; onClick: () => void;
}) {
  const serveDesc = serving ? `, serving${showServer ? `, ${serverNumber === 1 ? "1st" : "2nd"} server` : ""}` : "";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${name} won the rally - tap to record. ${name} currently ${score}${serveDesc}`}
      className="flex flex-col items-center justify-center gap-3 rounded-3xl active:scale-[0.98] transition-transform disabled:opacity-60"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 22%, var(--bg-card)), var(--bg-card))`,
        border: serving ? `2px solid ${color}` : "1px solid var(--border)",
      }}
    >
      <span className="font-display font-black leading-none" style={{ fontSize: "clamp(5rem, 30vw, 16rem)", color }}>
        {score}
      </span>
      <span className="text-base sm:text-xl font-semibold px-2 text-center truncate max-w-full" style={{ color: "var(--text)" }}>
        {name}
      </span>
      {serving && (
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
          Serving
          {showServer && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: color, color: "#fff" }}>
              <span className="flex items-center gap-0.5">
                {[1, 2].map((n) => (
                  <span key={n} className="w-1.5 h-1.5 rounded-full" style={{ background: n <= serverNumber ? "#fff" : "rgba(255,255,255,0.4)" }} />
                ))}
              </span>
              {serverNumber === 1 ? "1st" : "2nd"} server
            </span>
          )}
        </span>
      )}
    </button>
  );
}
