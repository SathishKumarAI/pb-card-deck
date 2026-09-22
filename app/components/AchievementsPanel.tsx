"use client";

import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";
import { getStats, listMatches, listDecks, listFavoriteIds } from "@/lib/client-api";
import { Sheet } from "./HistoryPanel";

type Ctx = { stats: Record<string, number>; matches: number; decks: number; favorites: number };
type Achievement = { id: string; name: string; desc: string; done: (c: Ctx) => boolean };

// Local milestones, no accounts (backlog F121).
const ACHIEVEMENTS: Achievement[] = [
  { id: "first-draw", name: "First Twist", desc: "Draw your first card", done: (c) => (c.stats.draws ?? 0) >= 1 },
  { id: "card-shark", name: "Card Shark", desc: "Draw 100 cards", done: (c) => (c.stats.draws ?? 0) >= 100 },
  { id: "high-roller", name: "High Roller", desc: "Draw 500 cards", done: (c) => (c.stats.draws ?? 0) >= 500 },
  { id: "legend", name: "Legendary!", desc: "Draw a Legendary card", done: (c) => (c.stats.legendary ?? 0) >= 1 },
  { id: "collector", name: "Collector", desc: "Favorite 5 cards", done: (c) => c.favorites >= 5 },
  { id: "builder", name: "Deck Builder", desc: "Create a custom deck", done: (c) => c.decks >= 1 },
  { id: "regular", name: "Regular", desc: "Finish 10 matches", done: (c) => c.matches >= 10 },
  { id: "veteran", name: "Veteran", desc: "Finish 50 matches", done: (c) => c.matches >= 50 },
  { id: "daily", name: "Daily Devotee", desc: "Play 5 daily challenges", done: (c) => (c.stats.daily ?? 0) >= 5 },
];

export default function AchievementsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ctx, setCtx] = useState<Ctx>({ stats: {}, matches: 0, decks: 0, favorites: 0 });

  useEffect(() => {
    if (open) {
      setCtx({
        stats: getStats(),
        matches: listMatches().length,
        decks: listDecks().length,
        favorites: listFavoriteIds().length,
      });
    }
  }, [open]);

  if (!open) return null;

  const unlocked = ACHIEVEMENTS.filter((a) => a.done(ctx)).length;

  return (
    <Sheet title="Achievements" icon={<Award size={18} />} onClose={onClose}>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {unlocked} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="grid grid-cols-1 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const got = a.done(ctx);
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${got ? "var(--accent)" : "var(--border)"}`,
                opacity: got ? 1 : 0.6,
              }}
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "var(--bg-elevated)", color: got ? "var(--yellow)" : "var(--text-muted)" }}
              >
                {got ? <Award size={20} /> : <Lock size={18} />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{a.name}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
