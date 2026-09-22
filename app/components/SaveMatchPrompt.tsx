"use client";

/**
 * Asks before a finished match is written to the device.
 *
 * Shown once per finished match while the preference is "ask". Answering with
 * "remember" set turns it off for good, in either direction.
 */

import { useRef, useState } from "react";
import { Check, HardDriveDownload, Trash2 } from "lucide-react";
import { GameSession } from "@/lib/game";
import { HISTORY_CAP } from "@/lib/historyConsent";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";

export interface SaveMatchPromptProps {
  game: GameSession;
  /** `remember` means: stop asking, and apply this answer from now on. */
  onAnswer: (save: boolean, remember: boolean) => void;
}

export default function SaveMatchPrompt({ game, onAnswer }: SaveMatchPromptProps) {
  const [remember, setRemember] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Dismissing without choosing means "not this time" - never a silent save.
  useFocusTrap(ref, true, () => onAnswer(false, remember));
  useScrollLock(true);

  const { team1, team2 } = game.playerNames;
  const label = game.customName ?? "Match";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save this match?"
      className="sheet-scrim fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-4"
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="mat-thick sheet-rise w-full max-w-sm p-6 outline-none"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
      >
        <h2 className="font-display text-xl font-black" style={{ color: "var(--text)" }}>
          Save this match?
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          It would be kept on this device only - nothing is uploaded.
        </p>

        <div
          className="mt-4 flex items-center justify-between gap-3 px-3.5 py-3"
          style={{ background: "var(--bg-elevated)", borderRadius: "var(--r-panel)" }}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{label}</span>
            <span className="block text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {team1} v {team2}
            </span>
          </span>
          <span className="tnum font-display text-lg font-black shrink-0" style={{ color: "var(--accent)" }}>
            {game.score.team1}&ndash;{game.score.team2}
          </span>
        </div>

        {/* A checkbox, not a third button: the choice is the answer, and this
            only says whether to keep asking. */}
        <button
          onClick={() => setRemember((r) => !r)}
          role="checkbox"
          aria-checked={remember}
          className="pressable mt-4 flex w-full items-center gap-2.5 text-left"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center"
            style={{
              borderRadius: 6,
              border: `1px solid ${remember ? "var(--accent)" : "var(--mat-edge)"}`,
              background: remember ? "var(--accent)" : "transparent",
              color: "var(--accent-ink)",
            }}
          >
            {remember && <Check size={13} strokeWidth={3} />}
          </span>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Remember my answer and stop asking
          </span>
        </button>

        <div className="mt-5 flex flex-col gap-2">
          <button
            autoFocus
            data-autofocus
            onClick={() => onAnswer(true, remember)}
            className="pressable flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
          >
            <HardDriveDownload size={17} /> Save to this device
          </button>
          <button
            onClick={() => onAnswer(false, remember)}
            className="pressable flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <Trash2 size={15} /> Don&apos;t save
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Saved matches power History, streaks and share cards. The device keeps the
          last {HISTORY_CAP}; you can change this or clear everything from History at
          any time.
        </p>
      </div>
    </div>
  );
}
