"use client";

/**
 * "Share live link" - the organiser's side of a read-only spectator link.
 *
 * Owns the words and the controls; every decision lives in `lib/share/eventShare.ts`.
 *
 * Two pieces of copy here are load-bearing rather than decorative:
 *
 * - **It says what the link publishes** ("the schedule, results and player names")
 *   before anything is created. An organiser is sharing other people's names, and a
 *   button that does not say so is asking for consent nobody gave.
 * - **It says the link is shown once**, because only a hash is stored and the token
 *   genuinely cannot be recovered. A UI that implies otherwise would make people
 *   think they had lost something.
 */

import { useCallback, useEffect, useState } from "react";
import { Link2, Copy, Check, Ban, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { Sheet } from "../HistoryPanel";
import {
  createShare, listShares, revokeShare, shareState,
  type ShareRow,
} from "@/lib/share/eventShare";

const EXPIRY_CHOICES: { label: string; days: number | null }[] = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "Never", days: null },
];

export default function ShareLinkPanel({
  open,
  onClose,
  tournamentId,
  eventName,
}: {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  eventName: string;
}) {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [days, setDays] = useState<number | null>(7);
  const [fresh, setFresh] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows(await listShares(tournamentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this event's links.");
    }
  }, [tournamentId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const close = () => {
    setFresh(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  const mint = async () => {
    setBusy(true);
    setError(null);
    try {
      const made = await createShare(tournamentId, days, eventName.slice(0, 60));
      setFresh({ url: made.url });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the link.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy automatically - select the link and copy it.");
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await revokeShare(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke that link.");
    } finally {
      setBusy(false);
    }
  };

  const live = rows.filter((r) => shareState(r) === "live");

  return (
    <Sheet title="Share live link" icon={<Link2 size={18} style={{ color: "var(--accent)" }} />} onClose={close}>
      <div className="flex flex-col gap-4">
        <div className="mat-thin rounded-[var(--r-panel)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p className="font-semibold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Eye size={15} style={{ color: "var(--accent)" }} /> What people will see
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The schedule, results, standings and bracket, updating as you enter scores.</li>
            <li><strong>The player names in this event</strong> - so only share it where those people would expect it.</li>
            <li>Nothing they can change. There is no way to enter a score from a link.</li>
            <li>No signup: anyone with the link can open it, and you can revoke it.</li>
          </ul>
        </div>

        {fresh ? (
          <div className="rounded-[var(--r-panel)] p-4 flex flex-col gap-2" style={{ border: "1px solid var(--accent)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Your link - copy it now
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This is the only time it can be shown. Only a fingerprint of it is stored,
              so it cannot be looked up again - if you lose it, revoke it and make another.
            </p>
            <code
              className="text-xs break-all p-2 rounded-[var(--r-ctl)]"
              style={{ background: "var(--bg-elevated)", color: "var(--text)" }}
            >
              {fresh.url}
            </code>
            <button
              onClick={copy}
              className="pressable hoverable flex items-center justify-center gap-2 py-2.5 rounded-[var(--r-ctl)] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Link expires after</p>
            <div className="flex gap-1 flex-wrap">
              {EXPIRY_CHOICES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setDays(c.days)}
                  aria-pressed={days === c.days}
                  className="pressable px-3 py-2 rounded-[var(--r-chip)] text-sm font-medium"
                  style={
                    days === c.days
                      ? { background: "var(--accent)", color: "var(--accent-ink)" }
                      : { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              A club night&apos;s link should not outlive the season, so seven days is the
              default.
            </p>
            <button
              onClick={mint}
              disabled={busy}
              className="pressable hoverable flex items-center justify-center gap-2 py-3 rounded-[var(--r-ctl)] font-semibold mt-1"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? <Loader2 size={16} className="anim-spin" /> : <Link2 size={16} />}
              Create a link
            </button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Links for this event {live.length > 0 && <span style={{ color: "var(--text-muted)" }}>({live.length} live)</span>}
            </p>
            {rows.map((r) => {
              const state = shareState(r);
              return (
                <div key={r.id} className="mat-thin rounded-[var(--r-ctl)] p-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p style={{ color: "var(--text)" }}>
                      {state === "live" ? "Live" : state === "revoked" ? "Revoked" : "Expired"}
                      {r.expires_at && state === "live" && (
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}· until {new Date(r.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Made {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  {state === "live" && (
                    <button
                      onClick={() => revoke(r.id)}
                      disabled={busy}
                      className="pressable shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-ctl)] text-sm font-semibold"
                      style={{ background: "transparent", border: "1px solid var(--red)", color: "var(--red)" }}
                    >
                      <Ban size={14} /> Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm flex items-start gap-2" style={{ color: "var(--red)" }}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
