"use client";

/**
 * The spectator's page: a read-only live view of one event, opened from a share link.
 *
 * It renders the SAME standings and bracket components the organiser sees, fed from
 * the database function's payload, so the two views cannot drift into different
 * answers about who is winning.
 *
 * Three things this page deliberately does:
 *
 * 1. **Reads the token from the URL fragment**, which is never sent to a server, so
 *    the token stays out of access logs and out of the `Referer` header.
 * 2. **Polls only while the tab is visible**, every 30 seconds. A club night is
 *    minutes between results, and a phone in a pocket must not poll at all.
 * 3. **Names its failure.** Expired, revoked and unknown links are indistinguishable
 *    by design, so the page says so honestly and tells the viewer what to do, rather
 *    than guessing or showing an empty bracket.
 *
 * Nothing here can write. There is no score entry, no undo, no edit - a spectator
 * holds a token, not a session.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, RefreshCw, AlertTriangle, Trophy, ListChecks, Table2, GitBranch } from "lucide-react";
import { FORMAT_INFO } from "@/lib/tournament/types";
import { standings, playerStandings, poolStandings } from "@/lib/tournament/standings";
import { progress } from "@/lib/tournament/engine";
import StandingsTable from "@/components/tournament/StandingsTable";
import BracketView from "@/components/tournament/BracketView";
import { fetchSharedEvent, tokenFromHash, type SharedEventResult } from "@/lib/share/eventShare";

const POLL_MS = 30_000;

type Tab = "now" | "schedule" | "table" | "bracket";

export default function SharedEventPage() {
  const [result, setResult] = useState<SharedEventResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("now");
  const tokenRef = useRef<string | null>(null);

  /**
   * `spinner` is false on the first load and on a background poll: `loading` already
   * starts true for the first, and a poll that flashes a spinner every 30 seconds is
   * worse than one that does not. It also keeps the mount effect free of a synchronous
   * setState, which is a cascading render.
   */
  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    setResult(await fetchSharedEvent(tokenRef.current));
    setLoading(false);
  }, []);

  useEffect(() => {
    tokenRef.current = tokenFromHash(window.location.hash);
    void load();
    const onHash = () => {
      tokenRef.current = tokenFromHash(window.location.hash);
      void load();
    };
    window.addEventListener("hashchange", onHash);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [load]);

  if (loading && !result) return <Shell><p style={{ color: "var(--text-secondary)" }}>Loading the event…</p></Shell>;
  if (!result) return null;

  if (!result.ok) return <Shell><Problem reason={result.reason} onRetry={() => void load(true)} /></Shell>;

  const t = result.tournament;
  const isRotating = t.entryMode === "rotating";
  const rows = isRotating ? playerStandings(t) : standings(t);
  const champion = t.championTeamId ? rows.find((r) => r.teamId === t.championTeamId) : undefined;
  const { played, total } = progress(t);
  const onCourt = t.matches
    .filter((m) => m.court && !m.winner && m.teamA && m.teamB)
    .sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
  const justFinished = t.matches.filter((m) => m.winner).slice(-6).reverse();

  const tabs: { key: Tab; label: string; icon: typeof ListChecks }[] = [
    { key: "now", label: "On now", icon: ListChecks },
    { key: "schedule", label: "Schedule", icon: Table2 },
    { key: "table", label: isRotating ? "Players" : "Standings", icon: Trophy },
    { key: "bracket", label: "Bracket", icon: GitBranch },
  ];

  const nameOf = (id?: string) =>
    (id && (t.teams.find((x) => x.id === id)?.name ?? t.players.find((p) => p.id === id)?.name)) || "TBD";

  return (
    <Shell>
      <header className="mb-4">
        <div className="mat-thin rounded-[var(--r-panel)] p-3 flex items-center gap-2 mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Eye size={15} style={{ color: "var(--accent)" }} />
          <span>
            <strong style={{ color: "var(--text)" }}>Live view.</strong> Nothing here can be
            changed — scores are entered by whoever is running the event.
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text)" }}>{t.name}</h1>
        <p className="text-sm tnum" style={{ color: "var(--text-secondary)" }}>
          {FORMAT_INFO[t.format].label} · {played}/{total} matches played
          {champion ? ` · Winner: ${champion.name}` : ""}
        </p>
        <button
          onClick={() => void load(true)}
          className="pressable hoverable mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--r-ctl)] text-sm"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <RefreshCw size={14} className={loading ? "anim-spin" : undefined} />
          {loading ? "Refreshing…" : `Updated ${timeAgo(result.fetchedAt)}`}
        </button>
      </header>

      <div className="flex gap-1 mb-4 overflow-x-auto scroll-area">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className="pressable shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[var(--r-chip)] text-sm font-medium"
            style={tab === key ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--text-secondary)" }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "now" && (
        <section className="flex flex-col gap-3">
          {onCourt.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Nothing on court right now.
            </p>
          )}
          {onCourt.map((m) => (
            <div key={m.id} className="mat-thin rounded-[var(--r-panel)] p-3">
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Court {m.court}{m.label ? ` · ${m.label}` : ""}
              </p>
              <p className="font-semibold" style={{ color: "var(--text)" }}>
                {nameOf(m.teamA)} <span style={{ color: "var(--text-muted)" }}>vs</span> {nameOf(m.teamB)}
              </p>
            </div>
          ))}
          {justFinished.length > 0 && (
            <>
              <h2 className="text-sm font-semibold mt-2" style={{ color: "var(--text)" }}>Just finished</h2>
              {justFinished.map((m) => (
                <p key={m.id} className="text-sm tnum" style={{ color: "var(--text-secondary)" }}>
                  {nameOf(m.teamA)} {m.scoreA}–{m.scoreB} {nameOf(m.teamB)}
                </p>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "schedule" && (
        <section className="flex flex-col gap-2">
          {t.matches.filter((m) => m.a.from !== "bye" && m.b.from !== "bye").map((m) => (
            <div key={m.id} className="mat-thin rounded-[var(--r-panel)] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Round {m.round}{m.pool ? ` · Pool ${m.pool}` : ""}{m.court ? ` · Court ${m.court}` : ""}
                </p>
                <p className="text-sm" style={{ color: "var(--text)" }}>
                  {nameOf(m.teamA)} vs {nameOf(m.teamB)}
                </p>
              </div>
              <p className="tnum text-sm font-semibold shrink-0" style={{ color: m.winner ? "var(--text)" : "var(--text-muted)" }}>
                {m.winner ? `${m.scoreA}–${m.scoreB}` : "—"}
              </p>
            </div>
          ))}
        </section>
      )}

      {tab === "table" && (
        <section className="flex flex-col gap-4">
          {isRotating ? (
            <StandingsTable rows={rows} title="Every player" />
          ) : t.format === "pools-bracket" ? (
            poolStandings(t).map(({ pool, rows: poolRows }) => (
              <StandingsTable key={pool} rows={poolRows} title={`Pool ${pool}`} qualifyingCount={t.config.advancePerPool} />
            ))
          ) : (
            <StandingsTable rows={rows} />
          )}
        </section>
      )}

      {tab === "bracket" && <BracketView tournament={t} />}

      <footer className="mt-8 text-xs" style={{ color: "var(--text-muted)" }}>
        Shown from a share link. The organiser can revoke it at any time.{" "}
        <Link href="/" style={{ color: "var(--accent)" }}>What is PB Card Deck?</Link>
      </footer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-col--wide mx-auto px-4 py-6" style={{ minHeight: "100dvh" }}>
      {children}
    </main>
  );
}

/** Every failure states what happened and what to do about it. */
function Problem({ reason, onRetry }: { reason: Exclude<SharedEventResult, { ok: true }>["reason"]; onRetry: () => void }) {
  const copy: Record<typeof reason, { title: string; body: string }> = {
    "no-token": {
      title: "This link is incomplete",
      body: "The part after the # is missing, which usually means the link was cut short when it was copied. Ask for it again.",
    },
    "not-found": {
      title: "This link no longer works",
      body: "It has expired, been revoked by the organiser, or the event was deleted. Ask the organiser for a new link.",
    },
    offline: {
      title: "You are offline",
      body: "A live view needs a connection. This page will load as soon as you are back on a network.",
    },
    unconfigured: {
      title: "Share links are not enabled here",
      body: "This copy of the app has no account service connected, so it cannot open a shared event.",
    },
    error: {
      title: "Could not load the event",
      body: "Something went wrong reaching the event. It is worth trying again.",
    },
  };
  const { title, body } = copy[reason];
  return (
    <div className="mat-thin rounded-[var(--r-panel)] p-5 max-w-[32rem]">
      <h1 className="font-display text-lg font-bold flex items-center gap-2 mb-2" style={{ color: "var(--text)" }}>
        <AlertTriangle size={18} style={{ color: "var(--red)" }} /> {title}
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{body}</p>
      <div className="flex gap-2">
        {reason !== "unconfigured" && reason !== "no-token" && (
          <button
            onClick={onRetry}
            className="pressable px-3 py-2 rounded-[var(--r-ctl)] text-sm font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Try again
          </button>
        )}
        <Link
          href="/"
          className="pressable px-3 py-2 rounded-[var(--r-ctl)] text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Open the app
        </Link>
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
