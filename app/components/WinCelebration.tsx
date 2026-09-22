"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, RotateCcw, Share2 } from "lucide-react";
import SharePanel from "./SharePanel";
import { useToast } from "./Toast";
import { useScrollLock } from "@/lib/useScrollLock";

export default function WinCelebration({
  winnerName,
  score,
  matchOver = false,
  seriesWon,
  onNewGame,
  onNewMatch,
  onEndMatch,
}: {
  winnerName: string;
  score: { team1: number; team2: number };
  matchOver?: boolean;
  seriesWon?: { team1: number; team2: number };
  onNewGame: () => void;
  onNewMatch: () => void;
  onEndMatch: () => void;
}) {
  const [confetti, setConfetti] = useState<{ x: number; color: string; delay: number; dur: number; size: number; rect: boolean }[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  useScrollLock(true);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  useEffect(() => {
    // Don't render confetti for reduced-motion users - the global CSS override
    // would otherwise freeze 90 colored squares mid-fall instead of a celebration.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#cba6f7", "#fab387", "#34d399"];
    const pieces = Array.from({ length: 90 }, (_, i) => ({
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 2.5,
      dur: 2.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      rect: Math.random() > 0.5,
    }));
    setConfetti(pieces);
  }, []);

  // Move focus into the dialog so keyboard/SR users land on the primary action.
  useEffect(() => { nextBtn.current?.focus(); }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="win-title" className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-hidden">
      {/* Confetti */}
      {confetti.map((p, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.rect ? p.size * 0.5 : p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.rect ? "2px" : "50%",
            animation: `confettiFall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}

      <div className="glass rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl relative z-10 anim-pop" style={{ border: "1px solid var(--border)" }}>
        <div className="flex justify-center mb-4 anim-float" style={{ color: "var(--yellow)", filter: "drop-shadow(0 8px 20px rgba(251,191,36,0.5))" }}>
          <Trophy size={72} strokeWidth={1.5} />
        </div>
        <h2 id="win-title" className="font-display text-3xl font-black mb-2" style={{ color: "var(--text)" }}>
          {matchOver ? `${winnerName} wins the match!` : `${winnerName} Wins!`}
        </h2>
        <p className="text-xl font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
          {score.team1} - {score.team2}
        </p>
        {seriesWon && (
          <p className="text-sm font-medium mb-6" style={{ color: matchOver ? "var(--yellow)" : "var(--text-muted)" }}>
            Match {seriesWon.team1}-{seriesWon.team2}
          </p>
        )}
        {!seriesWon && <div className="mb-6" />}

        <div className="flex flex-col gap-3">
          {matchOver ? (
            <button
              ref={nextBtn}
              onClick={onNewMatch}
              className="pressable flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <RotateCcw size={18} /> New match
            </button>
          ) : (
            <button
              ref={nextBtn}
              onClick={onNewGame}
              className="pressable flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <RotateCcw size={18} /> Next game
            </button>
          )}
          <button
            onClick={() => setShareOpen(true)}
            className="pressable flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            <Share2 size={18} /> Share result
          </button>
          <button
            onClick={onEndMatch}
            className="pressable px-6 py-3 font-medium rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            End match
          </button>
        </div>
      </div>

      {shareOpen && (
        <SharePanel
          card={{ kind: "result", winnerName, score, matchOver, seriesWon }}
          title="Share this win"
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
