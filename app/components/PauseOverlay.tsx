"use client";

/** The paused-game overlay. Owns its own focus trap and scroll lock. */

import { useRef } from "react";
import { Pause, Play } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";

export default function PauseOverlay({
  elapsed, onResume,
}: { elapsed: string; onResume: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onResume);
  useScrollLock(true);

  return (
    <div role="dialog" aria-modal="true" aria-label="Game paused" className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
      <div ref={ref} tabIndex={-1} className="mat-thick p-8 text-center max-w-sm w-full anim-pop outline-none" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}>
        <div className="flex justify-center mb-4 anim-float" style={{ color: "var(--accent)" }}>
          <Pause size={64} strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-3xl font-black mb-1" style={{ color: "var(--text)" }}>Paused</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{elapsed} elapsed · scoring is on hold</p>
        <button
          autoFocus
          data-autofocus
          onClick={onResume}
          className="pressable w-full flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-full"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
        >
          <Play size={18} fill="currentColor" /> Resume
        </button>
      </div>
    </div>
  );
}
