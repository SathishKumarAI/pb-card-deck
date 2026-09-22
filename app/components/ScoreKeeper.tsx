"use client";

import { GameSession, pointStatus, outcomeMessage } from "@/lib/game";
import { speak } from "@/lib/sounds";
import { CircleDot, Minus, Flame, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ScoreKeeper({
  game,
  onScore,
  onSideOut,
  onAdjust,
}: {
  game: GameSession;
  onScore: (team: 1 | 2) => void;
  onSideOut: () => void;
  onAdjust?: (team: 1 | 2, delta: number) => void;
}) {
  const locked = game.config.scoreLocked || !!game.winner;
  const point = pointStatus(game);
  const isDoubles = game.config.gameType !== "singles";
  // Server 1/2 only rotates (and is meaningful) in official doubles; hide the
  // server badge in casual doubles where it would never change.
  const officialDoubles = isDoubles && !!game.config.officialMode;
  // In official side-out mode we act on the SERVING side's result (WON/LOST)
  // instead of tapping the opponent - clearer for coaches/umpires.
  const officialSideOut = !!game.config.officialMode && game.config.sideOutScoring && !game.winner;
  const servingName = game.servingTeam === 1 ? game.playerNames.team1 : game.playerNames.team2;
  const otherName = game.servingTeam === 1 ? game.playerNames.team2 : game.playerNames.team1;
  const lostSub = isDoubles && game.serverNumber === 1 ? "→ 2nd server serves" : `→ side out to ${otherName}`;

  // Consequence narration: on every state change, describe what happened in
  // plain words ("Point Eagles 4-2" / "Side out - Hawks serve") and, if the
  // user opted in, speak it aloud. This is what makes "tap who won" legible to
  // beginners who don't know side-out scoring.
  const prevGame = useRef(game);
  const [outcome, setOutcome] = useState("");
  useEffect(() => {
    const msg = outcomeMessage(prevGame.current, game);
    prevGame.current = game;
    if (!msg) return;
    setOutcome(msg);
    if (game.config.announceScore) speak(msg);
    const t = setTimeout(() => setOutcome(""), 3200);
    return () => clearTimeout(t);
  }, [game]);
  // Side switch at the game midpoint (e.g. first to 6 in an 11-point game) - F062.
  const half = Math.ceil(game.config.pointsToWin / 2);
  const switchSides = !game.winner && (
    (game.score.team1 === half && game.score.team2 < half) ||
    (game.score.team2 === half && game.score.team1 < half)
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      {/* Switch-sides reminder (F062) */}
      {switchSides && (
        <div
          className="anim-pop flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
          role="status"
          aria-live="polite"
          style={{ background: "var(--bg-elevated)", color: "var(--blue)", border: "1px solid var(--blue)" }}
        >
          <RefreshCw size={13} /> Switch sides
        </div>
      )}

      {/* Game / match point banner (F077) */}
      {point && (
        <div
          className="anim-pop flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
          role="status"
          aria-live="polite"
          style={{ background: "var(--bg-elevated)", color: point.match ? "var(--red)" : "var(--yellow)", border: `1px solid ${point.match ? "var(--red)" : "var(--yellow)"}` }}
        >
          <Flame size={13} />
          {point.match ? "Match point" : "Game point"}: {point.team === 1 ? game.playerNames.team1 : game.playerNames.team2}
        </div>
      )}

      {/* Consequence narration - what the last tap did, in plain words */}
      {outcome && !game.winner && (
        <div
          className="anim-pop text-sm font-bold px-4 py-1.5 rounded-full"
          role="status"
          aria-live="polite"
          style={{ background: "var(--bg-elevated)", color: "var(--accent)", border: "1px solid var(--accent)" }}
        >
          {outcome}
        </div>
      )}

      {/* Serving indicator - casual side-out only (official mode shows the rich
          serving card in OfficialControls instead). Tap = manual side out. */}
      {game.config.sideOutScoring && !game.config.officialMode && (
        <button onClick={onSideOut} aria-label="Side out - switch serving team" aria-live="polite" className="pressable flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--yellow)", border: "1px solid var(--border)" }}>
          <CircleDot size={13} /> Serving: {game.servingTeam === 1 ? game.playerNames.team1 : game.playerNames.team2}
        </button>
      )}

      {/* Prompt: WON/LOST flow in official side-out, else tap-who-won */}
      {!game.winner && (
        <p className="text-xs font-semibold text-center" style={{ color: "var(--text-muted)" }}>
          {officialSideOut
            ? `${servingName} is serving — did they win the rally?`
            : "Who won the rally? Tap their score."}
        </p>
      )}

      {/* Score. In official mode the divider reads as the NET (court-side framing
          like the Referee app) so a coach taps "the side that won". */}
      <div
        className="mat-thin flex items-center justify-center gap-4 sm:gap-6 w-full px-4 py-4"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)", boxShadow: "var(--elev-1)" }}
      >
        <ScoreButton
          score={game.score.team1}
          name={game.playerNames.team1}
          color="var(--blue)"
          serving={game.servingTeam === 1}
          serverNumber={game.serverNumber}
          showServer={officialDoubles}
          interactive={!officialSideOut}
          disabled={locked}
          onClick={() => onScore(1)}
        />

        {game.config.officialMode ? (
          <span className="flex flex-col items-center gap-1" aria-hidden>
            <span className="w-px h-16" style={{ background: "repeating-linear-gradient(var(--text-muted) 0 4px, transparent 4px 8px)" }} />
            <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>NET</span>
          </span>
        ) : (
          <span className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--text-muted)" }}>VS</span>
        )}

        <ScoreButton
          score={game.score.team2}
          name={game.playerNames.team2}
          color="var(--red)"
          serving={game.servingTeam === 2}
          serverNumber={game.serverNumber}
          showServer={officialDoubles}
          interactive={!officialSideOut}
          disabled={locked}
          onClick={() => onScore(2)}
        />
      </div>

      {/* Official side-out: act on the SERVING side's result. No tapping the
          opponent to change the serve. */}
      {officialSideOut && !locked && (
        <div className="w-full max-w-sm grid grid-cols-2 gap-2">
          <button
            onClick={() => onScore(game.servingTeam)}
            className="pressable flex flex-col items-center gap-0.5 py-3 font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: "var(--r-panel)" }}
          >
            <span className="text-sm">{servingName} won</span>
            <span className="text-[11px] font-medium opacity-90">+1 point</span>
          </button>
          <button
            onClick={onSideOut}
            className="pressable flex flex-col items-center gap-0.5 py-3 font-bold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-panel)" }}
          >
            <span className="text-sm">{servingName} lost</span>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{lostSub}</span>
          </button>
        </div>
      )}

      {/* Manual score correction - subtle -1 per team (F065) */}
      {onAdjust && !game.config.scoreLocked && (game.score.team1 > 0 || game.score.team2 > 0) && (
        <div className="flex items-center justify-center gap-6 sm:gap-8 -mt-1">
          <CorrectButton name={game.playerNames.team1} disabled={game.score.team1 === 0} onClick={() => onAdjust(1, -1)} />
          <span className="w-6" />
          <CorrectButton name={game.playerNames.team2} disabled={game.score.team2 === 0} onClick={() => onAdjust(2, -1)} />
        </div>
      )}

      {/* Game progress */}
      {game.gameResults.length > 0 && (
        <div className="flex items-center gap-2 text-xs flex-wrap justify-center" style={{ color: "var(--text-muted)" }}>
          {game.gameResults.map((r, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)" }}>G{i + 1}: {r.team1}-{r.team2}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function CorrectButton({ name, disabled, onClick }: { name: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Subtract a point from ${name}`}
      className="pressable flex items-center justify-center min-w-[44px] min-h-[44px] disabled:opacity-25"
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-full"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <Minus size={13} />
      </span>
    </button>
  );
}

function ScoreButton({ score, name, color, serving, serverNumber, showServer, interactive, disabled, onClick }: {
  score: number; name: string; color: string; serving: boolean; serverNumber: 1 | 2; showServer: boolean; interactive: boolean; disabled: boolean; onClick: () => void;
}) {
  const [bump, setBump] = useState(false);
  const prev = useRef(score);

  useEffect(() => {
    if (score !== prev.current) {
      prev.current = score;
      setBump(true);
      const t = setTimeout(() => setBump(false), 420);
      return () => clearTimeout(t);
    }
  }, [score]);

  const serveDesc = serving ? `, serving${showServer ? `, ${serverNumber === 1 ? "1st" : "2nd"} server` : ""}` : "";
  const label = interactive
    ? `${name} won the rally - tap to record. ${name} currently ${score}${serveDesc}`
    : `${name} ${score}${serveDesc}`;

  const inner = (
    <>
      {/* Serve badge: ball + an explicit "1ST/2ND SERVER" chip with two dots so
          the current server is unmistakable (only in official doubles, where it
          rotates). */}
      <span className="flex flex-col items-center gap-0.5 min-h-[1.5rem] justify-end" aria-hidden>
        {serving && showServer && (
          <span
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--yellow)", color: "#000" }}
          >
            <span className="flex items-center gap-0.5">
              {[1, 2].map((n) => (
                <span key={n} className="w-1 h-1 rounded-full" style={{ background: n <= serverNumber ? "#000" : "rgba(0,0,0,0.3)" }} />
              ))}
            </span>
            {serverNumber === 1 ? "1st" : "2nd"} server
          </span>
        )}
        {serving && !showServer && <CircleDot size={13} style={{ color: "var(--yellow)" }} />}
      </span>
      {/* The numeral is the scoreboard; the team colour is a marker on it, not a
          slab behind it. Tabular figures keep the digits from shifting as the
          score climbs. */}
      <div
        className={`font-display tnum relative w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 flex items-center justify-center text-[2.75rem] sm:text-5xl font-black ${bump ? "anim-bump" : ""}`}
        style={{
          background: "var(--bg-elevated)",
          color: "var(--text)",
          borderRadius: "var(--r-panel)",
          border: `1px solid ${serving ? "var(--yellow)" : "var(--mat-edge)"}`,
          boxShadow: serving ? "0 0 0 3px color-mix(in srgb, var(--yellow) 18%, transparent)" : "var(--elev-1)",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {score}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-2.5 h-1 w-7 rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-semibold truncate max-w-[88px]" style={{ color: serving ? "var(--text)" : "var(--text-secondary)" }}>
        {name}
      </span>
    </>
  );

  // Read-only display (official side-out uses the WON/LOST buttons instead of
  // tapping the tiles).
  if (!interactive) {
    return (
      <div aria-label={label} className="flex flex-col items-center gap-1">
        {inner}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="score-tap flex flex-col items-center gap-1 transition-all active:scale-90 disabled:opacity-40"
    >
      {inner}
    </button>
  );
}
