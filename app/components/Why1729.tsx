"use client";

/** The question the number on the home screen begs, answered where it is asked. */

import { X } from "lucide-react";

export default function Why1729({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="sheet-scrim fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Why 1,729 cards"
    >
      <div
        className="mat-thick sheet-rise w-full max-w-sm p-6"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display text-xl font-black" style={{ color: "var(--text)" }}>
            Why exactly 1,729?
          </h2>
          <button onClick={onClose} aria-label="Close" className="pressable p-1.5 rounded-full shrink-0" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          1,729 is the Hardy&ndash;Ramanujan &ldquo;taxicab&rdquo; number: the smallest number that can be written as
          the sum of two cubes in two different ways.
        </p>
        <p className="tnum my-4 text-center text-base font-semibold" style={{ color: "var(--accent)" }}>
          1³ + 12³ = 9³ + 10³ = 1,729
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          The story goes that Ramanujan, visited in hospital by Hardy, who remarked his taxi number 1729 seemed
          rather dull, replied that it was quite the opposite. It made a better target for the deck than a round
          1,700.
        </p>
      </div>
    </div>
  );
}
