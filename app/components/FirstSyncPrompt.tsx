"use client";

/**
 * "Bring what is on this device into your account?" - asked once per account per
 * device, immediately after a first sign-in, and only when there is something to
 * ask about.
 *
 * It names real numbers from the store, because a dialog that says "your data" is
 * asking someone to consent to an unknown. Yes is the default action; No leaves
 * everything exactly where it is and is stated as such, so nobody has to guess
 * whether declining deletes something.
 */

import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { localDataCounts, shouldAskToClaim, claimLocalData, declineClaim } from "@/lib/sync/claim";
import { requestSync } from "@/lib/sync/runtime";

export default function FirstSyncPrompt() {
  const auth = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const counts = localDataCounts();

  if (dismissed || auth.status !== "signed-in" || !shouldAskToClaim(auth.userId, counts)) return null;

  const parts = [
    counts.matches ? `${counts.matches} match${counts.matches === 1 ? "" : "es"}` : null,
    counts.decks ? `${counts.decks} deck${counts.decks === 1 ? "" : "s"}` : null,
    counts.favorites ? `${counts.favorites} favourite card${counts.favorites === 1 ? "" : "s"}` : null,
  ].filter(Boolean) as string[];

  const yes = () => {
    if (!auth.userId) return;
    claimLocalData(auth.userId);
    requestSync(0);
    setDismissed(true);
  };

  const no = () => {
    if (auth.userId) declineClaim(auth.userId);
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-sync-title"
      className="sheet-scrim fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      <div
        className="sheet-rise mat-thick w-full sm:max-w-[26rem] p-5"
        style={{
          border: "1px solid var(--mat-edge)",
          borderRadius: "var(--r-sheet) var(--r-sheet) 0 0",
          boxShadow: "var(--elev-3)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="first-sync-title" className="font-display text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <UploadCloud size={18} style={{ color: "var(--accent)" }} />
            Bring your data with you?
          </h2>
          <button onClick={no} aria-label="Not now" className="pressable p-1.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          This device has <strong style={{ color: "var(--text)" }}>{parts.join(", ")}</strong> saved
          locally. Copy them into your account so they survive a cleared browser and
          show up on your other devices?
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Either way nothing is deleted. Say no and they stay on this device only -
          you can still export a backup any time.
        </p>

        <div className="flex gap-2">
          <button
            onClick={no}
            className="pressable flex-1 py-2.5 rounded-[var(--r-ctl)] text-sm font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Keep them local
          </button>
          <button
            onClick={yes}
            className="pressable flex-1 py-2.5 rounded-[var(--r-ctl)] text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Yes, bring them
          </button>
        </div>
      </div>
    </div>
  );
}
