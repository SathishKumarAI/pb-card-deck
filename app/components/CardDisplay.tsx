"use client";

import { Card, CATEGORY_COLORS, CATEGORY_INFO, RARITY_STYLE } from "@/lib/cards";
import { CategoryIcon } from "./icons";
import { Shuffle, Star, SkipForward, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import GlossaryText from "./GlossaryText";

// Intensity 1 (chill) .. 5 (chaos) shown as a small dot meter (backlog F522).
const INTENSITY_LABEL = ["", "Chill", "Light", "Spicy", "Intense", "Chaos"];
function IntensityDots({ value }: { value: number }) {
  const n = Math.max(1, Math.min(5, value));
  return (
    <span
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`Intensity ${n} of 5${INTENSITY_LABEL[n] ? `, ${INTENSITY_LABEL[n]}` : ""}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
        {INTENSITY_LABEL[n]}
      </span>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: i <= n ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.28)" }}
          />
        ))}
      </span>
    </span>
  );
}

export default function CardDisplay({
  card,
  onDraw,
  deckRemaining,
  isFavorite,
  onFavorite,
  onSkip,
  commentary = false,
  large = false,
}: {
  card: Card | null;
  onDraw: () => void;
  deckRemaining: number;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onSkip?: () => void;
  commentary?: boolean;
  large?: boolean;
}) {
  // If a card is already present on mount (e.g. resuming a game), show its face.
  const [flipped, setFlipped] = useState(!!card);
  const [shine, setShine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const handleDraw = () => {
    if (busy) return;
    // Reduced motion: skip the flip-out delay and the shine sweep so the new
    // card appears immediately instead of leaving the user staring at a frozen
    // (non-animating) card for ~320ms.
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setBusy(true);
    setShine(false);

    const reveal = () => {
      onDraw();
      requestAnimationFrame(() => {
        setFlipped(true);
        if (!reduceMotion) {
          setShine(true);
          setTimeout(() => setShine(false), 900);
        }
        setTimeout(() => setBusy(false), reduceMotion ? 50 : 600);
      });
    };

    if (flipped) {
      setFlipped(false);
      setTimeout(reveal, reduceMotion ? 0 : 320);
    } else {
      reveal();
    }
  };

  const gradient = card ? CATEGORY_COLORS[card.category] || "from-gray-500 to-gray-700" : "";

  return (
    <div className="flex flex-col items-center gap-5 flex-1 justify-center">
      {/* Card - scales with the device viewport but stays compact */}
      <div
        className="card-3d cursor-pointer"
        style={{ width: "min(90vw, 22rem)", height: "clamp(17rem, 46dvh, 28rem)" }}
        onClick={handleDraw}
      >
        <div className={`card-3d-inner ${flipped ? "is-flipped" : ""}`}>
          {/* Back of card */}
          <div
            className="card-face deck-back w-full h-full flex flex-col items-center justify-center gap-4 select-none"
            style={{
              background: "linear-gradient(155deg, var(--accent), var(--accent-dim))",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "var(--r-hero)",
              boxShadow: "var(--elev-3)",
            }}
          >
            <div className="anim-float" style={{ color: "var(--accent-ink)", opacity: 0.85 }}>
              <Shuffle size={48} strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl font-black" style={{ color: "var(--accent-ink)" }}>
              Tap to draw
            </div>
            <div className="tnum absolute bottom-5 text-xs px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.14)", color: "var(--accent-ink)", opacity: 0.8 }}>
              {deckRemaining.toLocaleString()} cards left
            </div>
          </div>

          {/* Face of card */}
          <div className={`card-face card-face--back shine ${shine ? "shine-run" : ""} w-full h-full overflow-hidden bg-gradient-to-br ${gradient} flex flex-col p-5 select-none`} style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: "var(--r-hero)", boxShadow: "var(--elev-3)" }}>
            <div className="flex justify-between items-start">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-white drop-shadow shrink-0">{card && <CategoryIcon category={card.category} size={30} strokeWidth={2} />}</span>
                {card?.rarity && (
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(0,0,0,0.28)", color: RARITY_STYLE[card.rarity].color, border: `1px solid ${RARITY_STYLE[card.rarity].color}` }}
                  >
                    {RARITY_STYLE[card.rarity].label}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {card && (
                  <button onClick={(e) => { e.stopPropagation(); setExplainerOpen(true); }} aria-label="What does this card mean?" className="flex items-center justify-center text-white/90 transition-transform hover:scale-125 active:scale-90 p-2.5 -m-1">
                    <HelpCircle size={20} />
                  </button>
                )}
                {onFavorite && (
                  <button onClick={(e) => { e.stopPropagation(); onFavorite(); }} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={isFavorite} className="flex items-center justify-center text-white transition-transform hover:scale-125 active:scale-90 p-2.5 -m-1">
                    <Star size={22} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                )}
              </span>
            </div>

            {/* The text scrolls when a card runs long. `justify-center` on a
                scroll container centres by OVERFLOWING both ends, which clips
                the title under the header with no way to scroll up to it - so
                the inner block centres with `m-auto` instead, which collapses
                to zero once the content is taller than the box. */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar w-full flex flex-col px-1 py-2">
              <div className="m-auto flex flex-col items-center gap-2 text-center w-full">
              <h2 className={`font-display ${large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} font-black text-white leading-tight drop-shadow-sm break-words`}>{card?.name}</h2>
              <p className={`${large ? "text-base sm:text-lg font-medium" : commentary ? "text-xs sm:text-sm" : "text-sm sm:text-base"} leading-snug text-white drop-shadow-sm`}>
                <GlossaryText>{(commentary && card?.commentary ? card.commentary : card?.effect) ?? ""}</GlossaryText>
              </p>
              {card?.detail && (
                <p className={`${large ? "text-sm" : "text-[11px] sm:text-xs"} leading-snug text-white/80 max-w-[18rem]`}>
                  <span className="font-semibold text-white/60 mr-1">What to do:</span>
                  <GlossaryText>{card.detail}</GlossaryText>
                </p>
              )}
              {typeof card?.intensity === "number" && (
                <IntensityDots value={card.intensity} />
              )}
              {card?.callout && (
                <p className="text-[11px] font-bold italic text-white/70">&ldquo;{card.callout}&rdquo;</p>
              )}
              </div>
            </div>

            <div className="flex justify-between items-end gap-2">
              <span className="text-xs text-white/70 bg-white/15 px-3 py-1 rounded-full backdrop-blur-sm truncate min-w-0">{card?.category}</span>
              {onSkip && (
                <button onClick={(e) => { e.stopPropagation(); onSkip(); }} aria-label="Skip this card" className="shrink-0 flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors p-2.5 -m-2.5">
                  Skip <SkipForward size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* One action under the card. Leaving is Back in the top bar - a second
          exit down here only competed with the thing you came to press. */}
      <button
        onClick={handleDraw}
        className="pressable flex items-center justify-center gap-2 w-full max-w-[22rem] px-8 py-3.5 text-base font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: "var(--r-chip)", boxShadow: "var(--elev-2)" }}
      >
        <Shuffle size={18} /> {flipped ? "Draw again" : "Draw a card"}
      </button>

      {/* Per-card plain-language explainer (F: zero-knowledge users) */}
      {explainerOpen && card && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`What ${card.name} means`}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setExplainerOpen(false)}
        >
          <div
            className="glass rounded-3xl p-6 max-w-sm w-full shadow-2xl anim-pop"
            style={{ border: "1px solid var(--accent)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex items-center gap-2 min-w-0">
                <span style={{ color: "var(--accent)" }}><CategoryIcon category={card.category} size={26} strokeWidth={2} /></span>
                <h2 className="font-display text-xl font-black leading-tight break-words" style={{ color: "var(--text)" }}>{card.name}</h2>
              </span>
              <button onClick={() => setExplainerOpen(false)} aria-label="Close" className="pressable shrink-0 p-1.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <section>
                <h3 className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>What this means</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                  <GlossaryText>{card.effect}</GlossaryText>
                </p>
              </section>

              {card.detail && (
                <section>
                  <h3 className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>How to play it</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <GlossaryText>{card.detail}</GlossaryText>
                  </p>
                </section>
              )}

              {CATEGORY_INFO[card.category] && (
                <section>
                  <h3 className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>What kind of card</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{CATEGORY_INFO[card.category]}</p>
                </section>
              )}
            </div>

            <p className="mt-4 text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
              Tip: underlined words explain a pickleball term when you tap them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
