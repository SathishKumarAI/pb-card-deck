"use client";

import { useMemo, useState } from "react";
import { Search, Library } from "lucide-react";
import { Card, CATEGORIES, RARITY_STYLE, Rarity } from "@/lib/cards";
import { CategoryIcon } from "./icons";
import { Sheet } from "./HistoryPanel";

// Browse + search the whole deck (backlog F549, F048). Read-only explorer so
// players can see every card, not just what they draw. Results are capped for
// performance with a count of what's hidden.
const CAP = 120;
const RARITIES: Rarity[] = ["signature", "common", "uncommon", "rare", "legendary"];

export default function CardBrowserPanel({
  open,
  onClose,
  allCards,
}: {
  open: boolean;
  onClose: () => void;
  allCards: Card[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allCards.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (rarity && c.rarity !== rarity) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.effect.toLowerCase().includes(needle) ||
        (c.detail?.toLowerCase().includes(needle) ?? false) ||
        (c.tags?.some((t) => t.toLowerCase().includes(needle)) ?? false)
      );
    });
  }, [allCards, q, cat, rarity]);

  const shown = filtered.slice(0, CAP);

  // Rarity distribution of the current result set (backlog F050).
  const dist = useMemo(() => {
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
    for (const c of filtered) if (c.rarity) counts[c.rarity] += 1;
    return counts;
  }, [filtered]);

  if (!open) return null;

  return (
    <Sheet title="Browse cards" icon={<Library size={18} />} onClose={onClose}>
      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, effect, tag..."
          aria-label="Search cards"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        <FilterChip active={!cat} onClick={() => setCat(null)}>All</FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</FilterChip>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        <FilterChip active={!rarity} onClick={() => setRarity(null)}>Any rarity</FilterChip>
        {RARITIES.map((r) => (
          <FilterChip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>{RARITY_STYLE[r].label}</FilterChip>
        ))}
      </div>

      <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
        {filtered.length} card{filtered.length === 1 ? "" : "s"}
        {filtered.length > CAP ? ` (showing first ${CAP} - refine to see more)` : ""}
      </p>

      {/* Rarity distribution (F050) */}
      {filtered.length > 0 && (
        <div className="mb-3">
          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            {RARITIES.map((r) =>
              dist[r] > 0 ? (
                <div key={r} title={`${RARITY_STYLE[r].label}: ${dist[r]}`} style={{ width: `${(dist[r] / filtered.length) * 100}%`, background: RARITY_STYLE[r].color }} />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {RARITIES.filter((r) => dist[r] > 0).map((r) => (
              <span key={r} className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: RARITY_STYLE[r].color }} />
                {RARITY_STYLE[r].label} {dist[r]}
              </span>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No cards match. Try a different search or filter.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((c) => (
            <div key={c.id} className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: "var(--accent)" }}><CategoryIcon category={c.category} size={16} /></span>
                <span className="text-sm font-semibold flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{c.name}</span>
                {c.rarity && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ color: RARITY_STYLE[c.rarity].color, border: `1px solid ${RARITY_STYLE[c.rarity].color}` }}>
                    {RARITY_STYLE[c.rarity].label}
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{c.effect}</p>
              {c.detail && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{c.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="pressable shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: active ? "var(--accent)" : "var(--bg-elevated)", color: active ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}
    >
      {children}
    </button>
  );
}
