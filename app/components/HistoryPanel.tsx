"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trophy, Clock, History, Trash2, Download } from "lucide-react";
import { selectionLabel } from "@/lib/cards";
import { useScrollLock } from "@/lib/useScrollLock";
import { listMatches, clearMatches, playerRecords, matchesToCsv, SavedMatch } from "@/lib/client-api";

function formatDur(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function HistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [records, setRecords] = useState<{ name: string; wins: number; played: number }[]>([]);

  useEffect(() => {
    if (open) {
      setMatches(listMatches());
      setRecords(playerRecords());
    }
  }, [open]);

  const downloadCsv = () => {
    const blob = new Blob([matchesToCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickleball-match-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <Sheet
      title="Match history"
      icon={<History size={18} />}
      onClose={onClose}
      action={
        matches.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadCsv}
              className="pressable flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={() => { clearMatches(); setMatches([]); }}
              className="pressable flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ background: "var(--bg-elevated)", color: "var(--red)" }}
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        ) : null
      }
    >
      {matches.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No saved matches yet. Finish a game to see it here.</p>
      ) : (
        <div className="stagger flex flex-col gap-2">
          {records.length > 0 && (
            <div className="rounded-xl p-3 mb-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="eyebrow mb-2">Win - loss record</div>
              <div className="flex flex-col gap-1">
                {records.slice(0, 5).map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[60%]" style={{ color: "var(--text)" }}>{r.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--accent)" }}>{r.wins}W</span> - {r.played - r.wins}L
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {matches.map((g) => {
            const modeLabel = selectionLabel(g.mode);
            return (
              <div key={g.id} className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    {modeLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Clock size={12} /> {formatDate(g.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Team name={g.team1_name} score={g.score_team1} win={g.winner === 1} color="var(--blue)" />
                  <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>vs</span>
                  <Team name={g.team2_name} score={g.score_team2} win={g.winner === 2} color="var(--red)" right />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {g.winner && <span className="flex items-center gap-1" style={{ color: "var(--yellow)" }}><Trophy size={12} /> {g.winner === 1 ? g.team1_name : g.team2_name}</span>}
                  <span>{formatDur(g.duration_ms)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

function Team({ name, score, win, color, right }: { name: string; score: number; win: boolean; color: string; right?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className="text-2xl font-black" style={{ color: win ? color : "var(--text-secondary)" }}>{score}</span>
      <span className="text-xs truncate max-w-[90px]" style={{ color: "var(--text)" }}>{name}</span>
    </div>
  );
}

export function Sheet({ title, icon, onClose, children, action }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; action?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollLock(true);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && ref.current) {
        // Trap focus within the dialog
        const f = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.(); // restore focus to the trigger on close
    };
  }, [onClose]);

  return (
    <div className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-rise scroll-area mat-thick w-full sm:max-w-[30rem] max-h-[88dvh] p-5 outline-none"
        style={{
          border: "1px solid var(--mat-edge)",
          borderRadius: "var(--r-sheet) var(--r-sheet) 0 0",
          boxShadow: "var(--elev-3)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS grabber: says "this sheet drags/dismisses" before you touch it */}
        <div aria-hidden className="sm:hidden mx-auto mb-3 h-1 w-9 rounded-full" style={{ background: "var(--text-muted)", opacity: 0.4 }} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold" style={{ color: "var(--text)" }}>{icon} {title}</h2>
          <div className="flex items-center gap-2">
            {action}
            <button onClick={onClose} aria-label="Close" className="pressable p-1.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
