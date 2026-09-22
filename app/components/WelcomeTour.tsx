"use client";

/**
 * First-run tour. Owns the three things someone needs before their first tap:
 * what this is, how a point works, and where help lives. Anything longer than
 * three slides gets skipped, so the detail lives in HelpPanel instead - the
 * last slide hands over to it.
 */

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";

type Slide = {
  title: string;
  body: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    title: "Pickleball, with twists",
    body: (
      <>
        <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--text)" }}>
          Play your normal game. Between points you draw a <strong>twist card</strong>: a small rule
          for the next rally, like &ldquo;soft shots only&rdquo; or &ldquo;swap partners&rdquo;. The app keeps score
          while you play.
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          It is free, needs no account, and works on the court with no signal.
        </p>
      </>
    ),
  },
  {
    title: "A point, start to finish",
    body: (
      <ol className="flex flex-col gap-3 text-left">
        {[
          "Tap the card. Read the twist out loud so everyone hears it.",
          "Play the rally under that twist.",
          "Tap the score of whoever won the rally - the app works out serve and side-out.",
        ].map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{s}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    title: "Never stuck for long",
    body: (
      <ul className="flex flex-col gap-2.5 text-left text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {[
          ["A word you don't know", "Underlined words on a card explain themselves when you tap them."],
          ["A card you don't get", "The ? on the card says what it means and how to play it."],
          ["Anything else", "Help, top right, answers it - and has a search box."],
        ].map(([k, v]) => (
          <li key={k}>
            <strong style={{ color: "var(--text)" }}>{k}.</strong>{" "}{v}
          </li>
        ))}
      </ul>
    ),
  },
];

export default function WelcomeTour({
  open,
  onClose,
  onOpenHelp,
}: {
  open: boolean;
  onClose: () => void;
  /** Hand over to the full manual from the last slide. */
  onOpenHelp?: () => void;
}) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];
  const finish = () => { setI(0); onClose(); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      className="sheet-scrim fixed inset-0 z-[85] flex items-center justify-center p-6"
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="mat-thick w-full max-w-sm p-6 anim-pop outline-none"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">
            Step {i + 1} of {SLIDES.length}
          </span>
          <button
            onClick={finish}
            className="pressable px-2 py-1 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Skip
          </button>
        </div>

        <h2 className="font-display mb-3 text-2xl font-black leading-tight" style={{ color: "var(--text)" }}>
          {slide.title}
        </h2>

        <div className="mb-6 min-h-[9.5rem]">{slide.body}</div>

        <div className="flex items-center gap-2">
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              aria-label="Previous step"
              className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <button
            data-autofocus
            onClick={() => (last ? finish() : setI(i + 1))}
            className="pressable flex flex-1 items-center justify-center gap-1.5 px-6 py-3 font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: "var(--r-chip)" }}
          >
            {last ? "Start playing" : "Next"} {!last && <ArrowRight size={16} />}
          </button>
        </div>

        {last && onOpenHelp && (
          <button
            onClick={() => { setI(0); onOpenHelp(); }}
            className="pressable mt-2.5 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{ color: "var(--text-secondary)", borderRadius: "var(--r-chip)" }}
          >
            <BookOpen size={15} /> Read the full manual first
          </button>
        )}
      </div>
    </div>
  );
}
