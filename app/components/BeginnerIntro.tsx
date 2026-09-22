"use client";

/** The three-step how-to-play shown the first time Beginner mode opens. */

import { useRef } from "react";
import { Sprout } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";

const STEPS = [
  "Tap the card to draw a twist - a simple rule for the next point.",
  "Play that point under the rule. Read the tip if you're unsure.",
  "Tap a team's score to give them the point. First to 11 (win by 2) wins.",
];

export default function BeginnerIntro({ onDismiss }: { onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onDismiss);
  useScrollLock(true);

  return (
    <div role="dialog" aria-modal="true" aria-label="How to play" className="sheet-scrim fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div ref={ref} tabIndex={-1} className="mat-thick p-7 max-w-sm w-full anim-pop outline-none" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}>
        <div className="flex justify-center mb-3" style={{ color: "var(--accent)" }}>
          <Sprout size={48} strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl font-black text-center mb-1" style={{ color: "var(--text)" }}>Welcome - here&apos;s how to play</h2>
        <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>Beginner mode keeps it simple.</p>
        <ol className="flex flex-col gap-3 mb-6">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{i + 1}</span>
              <span className="text-sm" style={{ color: "var(--text)" }}>{step}</span>
            </li>
          ))}
        </ol>
        <button
          autoFocus
          data-autofocus
          onClick={onDismiss}
          className="pressable w-full px-6 py-3 font-bold rounded-full"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
        >
          Got it - let&apos;s play
        </button>
      </div>
    </div>
  );
}
