"use client";

/**
 * The sync chip: `Synced` · `Saving n` · `Offline` · `Not synced`.
 *
 * It exists so the app never claims something is safe in the cloud while it is
 * sitting in an outbox. That is the whole job - it owns four words and a retry
 * button, and no logic beyond formatting.
 */

import { Check, CloudOff, RefreshCw, UploadCloud, AlertTriangle } from "lucide-react";
import { useSyncStatus, syncNowFromUi } from "@/lib/sync/runtime";
import { retryAll } from "@/lib/sync/outbox";

function ago(ts: number | null): string | null {
  if (!ts) return null;
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export default function SyncStatus() {
  const status = useSyncStatus();
  if (status.phase === "off") return null;

  const { icon, label, tone } =
    status.phase === "offline"
      ? { icon: <CloudOff size={14} />, label: "Offline - playing normally", tone: "var(--text-secondary)" }
      : status.phase === "error"
        ? { icon: <AlertTriangle size={14} />, label: "Not synced", tone: "var(--red)" }
        : status.phase === "syncing"
          ? { icon: <RefreshCw size={14} className="anim-spin" />, label: "Syncing…", tone: "var(--text-secondary)" }
          : status.pending > 0
            ? { icon: <UploadCloud size={14} />, label: `${status.pending} to save`, tone: "var(--text-secondary)" }
            : { icon: <Check size={14} />, label: "Synced", tone: "var(--accent)" };

  return (
    <div className="flex flex-col gap-2">
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm" style={{ color: tone }}>
        {icon}
        {label}
        {status.phase === "idle" && status.pending === 0 && status.lastSyncedAt && (
          <span style={{ color: "var(--text-muted)" }}>· {ago(status.lastSyncedAt)}</span>
        )}
      </p>

      {status.error && (
        <div className="rounded-[var(--r-panel)] p-3 text-sm" style={{ border: "1px solid var(--red)" }}>
          <p style={{ color: "var(--text-secondary)" }}>{status.error}</p>
          <button
            onClick={() => { retryAll(); void syncNowFromUi(); }}
            className="pressable mt-2 px-3 py-1.5 rounded-[var(--r-ctl)] text-sm font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Try again
          </button>
        </div>
      )}

      {status.phase !== "offline" && (
        <button
          onClick={() => void syncNowFromUi()}
          className="pressable hoverable self-start px-3 py-1.5 rounded-[var(--r-ctl)] text-sm font-medium"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Sync now
        </button>
      )}
    </div>
  );
}
