"use client";

/**
 * A running event. Owns the four views a tournament desk needs and nothing
 * else - the engine decides what is playable, this decides what is on screen.
 *
 * "On now" is the default tab on purpose: during an event the only question
 * anyone asks is "what is on court right now, and what do I type when it ends".
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft, ListChecks, Table2, GitBranch, Users, Trophy, Plus, Share2, Check, History, Download, X,
} from "lucide-react";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { FORMAT_INFO, DIVISION_INFO } from "@/lib/tournament/types";
import { EXPORT_INFO, exportTournament, exportFilename, type ExportFormat } from "@/lib/tournament/export";
import {
  playableMatches, recordResult, clearResult, liveMatches, progress, addRotatingRound,
} from "@/lib/tournament/engine";
import { standings, poolStandings, playerStandings } from "@/lib/tournament/standings";
import StandingsTable from "./StandingsTable";
import BracketView from "./BracketView";
import MatchCard from "./MatchCard";
import SharePanel from "../SharePanel";
import { useToast } from "../Toast";

type Tab = "now" | "schedule" | "table" | "bracket" | "teams" | "log";

export default function TournamentScreen({
  tournament,
  onChange,
  onExit,
  onPlayMatch,
}: {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
  onExit: () => void;
  /** Hand a match to the scorekeeper. */
  onPlayMatch: (m: TournamentMatch) => void;
}) {
  const [tab, setTab] = useState<Tab>("now");
  const [picked, setPicked] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const toast = useToast();

  const t = tournament;
  const isRotating = t.format === "rotating";
  const hasBracket = t.matches.some((m) => m.bracket === "winners" || m.bracket === "losers" || m.bracket === "final");
  const hasPools = t.matches.some((m) => m.bracket === "pool");

  const playable = useMemo(() => playableMatches(t), [t]);
  const onCourt = playable.filter((m) => m.court);
  const upNext = playable.filter((m) => !m.court).slice(0, 6);
  const { played, total } = progress(t);
  /** Last few decided matches - what fills the "On now" tab between rounds. */
  const recent = useMemo(
    () =>
      liveMatches(t)
        .filter((m) => m.winner && m.completedAt)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .slice(0, 6),
    [t],
  );
  const champion = t.teams.find((x) => x.id === t.championTeamId);

  const nameOf = (id?: string) => t.teams.find((x) => x.id === id)?.name ?? "—";

  const record = (m: TournamentMatch, a: number, b: number) => {
    onChange(recordResult(t, m.id, a, b));
    toast("Result saved");
  };
  const undo = (m: TournamentMatch) => {
    onChange(clearResult(t, m.id));
    toast("Result cleared");
  };

  const tabs: { key: Tab; label: string; icon: typeof ListChecks; show: boolean; mobileOnly?: boolean }[] = [
    { key: "now", label: "On now", icon: ListChecks, show: true },
    { key: "schedule", label: "Schedule", icon: Table2, show: true },
    { key: "table", label: isRotating ? "Players" : "Standings", icon: Trophy, show: true, mobileOnly: true },
    { key: "bracket", label: "Bracket", icon: GitBranch, show: hasBracket || t.format === "pools-bracket" },
    { key: "teams", label: isRotating ? "Players" : "Teams", icon: Users, show: !isRotating },
    { key: "log", label: "Changes", icon: History, show: (t.log?.length ?? 0) > 0 },
  ];

  const download = (format: ExportFormat) => {
    const blob = new Blob([exportTournament(t, format)], { type: EXPORT_INFO[format].mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(t, format);
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast(`Saved as ${EXPORT_INFO[format].label}`);
  };

  const shareText = () => {
    const lines = [`${t.name} - ${FORMAT_INFO[t.format].label}`, ""];
    const table = isRotating ? playerStandings(t) : standings(t);
    table.slice(0, 10).forEach((r) => lines.push(`${r.rank}. ${r.name}  ${r.wins}-${r.losses}  ${r.diff > 0 ? "+" : ""}${r.diff}`));
    if (champion) lines.push("", `Winner: ${champion.name}`);
    return lines.join("\n");
  };

  const share = async () => {
    // A finished event has a champion, so it deserves the image card; a
    // running one is more useful as pasteable text.
    if (champion) { setSharingImage(true); return; }
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ title: t.name, text });
      else { await navigator.clipboard.writeText(text); toast("Standings copied"); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Header: identity, progress and actions on ONE row. It used to be a
          280px stack that pushed the actual work below the fold. */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onExit} aria-label="All events" className="pressable hover-tint flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={16} /> <span className="hidden sm:inline">All events</span>
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-black leading-tight truncate" style={{ color: "var(--text)" }}>
            {t.name}
          </h1>
          <p className="text-[11px] tnum truncate" style={{ color: "var(--text-muted)" }}>
            {FORMAT_INFO[t.format].label}
            {t.config.division && t.config.division !== "open" ? ` · ${DIVISION_INFO[t.config.division].label}` : ""}
            {" · "}
            {isRotating ? `${t.players.length} players` : `${t.teams.length} teams`} · {t.config.courts} court
            {t.config.courts === 1 ? "" : "s"}
          </p>
        </div>

        {champion && (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-bold shrink-0 max-w-[14rem]"
            style={{ background: "color-mix(in srgb, var(--yellow) 14%, transparent)", border: "1px solid var(--yellow)", borderRadius: "var(--r-chip)", color: "var(--text)" }}
          >
            <Trophy size={14} style={{ color: "var(--yellow)" }} />
            <span className="truncate">{champion.name}</span>
          </span>
        )}

        {/* Progress, as a number and a rail, in the space the header row has
            going spare. */}
        <span className="hidden md:flex items-center gap-2 shrink-0">
          <span className="tnum text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {played}/{total}
          </span>
          <span className="h-1.5 w-24 overflow-hidden" style={{ background: "var(--bg-elevated)", borderRadius: 999 }}>
            <span className="block h-full transition-all duration-500" style={{ width: `${total ? (played / total) * 100 : 0}%`, background: "var(--accent)" }} />
          </span>
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExporting(true)}
            className="pressable hoverable mat-thin flex items-center gap-1.5 px-3 py-2 text-sm font-semibold"
            style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)", color: "var(--text)" }}
          >
            <Download size={15} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={share}
            className="pressable hoverable mat-thin flex items-center gap-1.5 px-3 py-2 text-sm font-semibold"
            style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)", color: "var(--text)" }}
          >
            <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Progress, on a phone where the header row has no room for it */}
      <div className="md:hidden h-1.5 w-full overflow-hidden" style={{ background: "var(--bg-elevated)", borderRadius: 999 }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${total ? (played / total) * 100 : 0}%`, background: "var(--accent)" }}
        />
      </div>

      {/* Tabs */}
      <div className="mat-thin flex gap-1 p-1 overflow-x-auto scroll-area" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
        {tabs.filter((x) => x.show).map(({ key, label, icon: Icon, mobileOnly }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`pressable flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${mobileOnly ? "lg:hidden" : ""}`}
            style={tab === key ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--text-secondary)" }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:items-start">
      <div className="flex flex-col gap-4">

      {/* ── On now ── */}
      {tab === "now" && (
        <div className="flex flex-col gap-4">
          {onCourt.length === 0 && upNext.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              {t.status === "complete" ? "Every match is played." : "Nothing is ready to start."}
            </p>
          )}

          {onCourt.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="eyebrow px-0.5">On court now</span>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))" }}>
                {onCourt.map((m) => (
                  <MatchCard
                    key={m.id}
                    tournament={t}
                    match={m}
                    onRecord={(a, b) => record(m, a, b)}
                    onPlay={() => onPlayMatch(m)}
                  />
                ))}
              </div>
            </section>
          )}

          {upNext.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="eyebrow px-0.5">Up next</span>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))" }}>
                {upNext.map((m) => (
                  <MatchCard key={m.id} tournament={t} match={m} onRecord={(a, b) => record(m, a, b)} onPlay={() => onPlayMatch(m)} />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="eyebrow px-0.5">Just finished</span>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))" }}>
                {recent.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setTab("schedule"); }}
                    className="mat-thin hoverable pressable flex items-center gap-2 px-2.5 py-2 text-left"
                    style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)" }}
                  >
                    <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                      {m.label ?? (m.pool ? m.pool : `R${m.round}`)}
                    </span>
                    <span className="text-xs truncate min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
                      {nameOf(m.winner)} beat {nameOf(m.winner === m.teamA ? m.teamB : m.teamA)}
                    </span>
                    <span className="tnum text-xs font-semibold shrink-0" style={{ color: "var(--text)" }}>
                      {Math.max(m.scoreA ?? 0, m.scoreB ?? 0)}-{Math.min(m.scoreA ?? 0, m.scoreB ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {isRotating && (
            <button
              onClick={() => { onChange(addRotatingRound(t)); toast("Round added"); }}
              className="pressable hoverable mat-thin flex items-center justify-center gap-2 py-3 text-sm font-semibold"
              style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)", color: "var(--text)" }}
            >
              <Plus size={16} /> Add another round
            </button>
          )}
        </div>
      )}

      {/* ── Schedule ── */}
      {tab === "schedule" && <Schedule tournament={t} onRecord={record} onPlay={onPlayMatch} onClear={undo} />}

      {/* ── Standings ── */}
      {tab === "table" && (
        <div className="flex flex-col gap-5">
          {isRotating ? (
            <StandingsTable rows={playerStandings(t)} title="Every player" />
          ) : hasPools ? (
            poolStandings(t).map(({ pool, rows }) => (
              <StandingsTable key={pool} rows={rows} title={`Pool ${pool}`} qualifyingCount={t.config.advancePerPool} />
            ))
          ) : (
            <StandingsTable rows={standings(t)} />
          )}
        </div>
      )}

      {/* ── Bracket ── */}
      {tab === "bracket" && (
        <div className="flex flex-col gap-3">
          <BracketView tournament={t} onPick={(m) => setPicked(m.id)} />
          {picked && (() => {
            const m = t.matches.find((x) => x.id === picked);
            if (!m) return null;
            return (
              <div className="anim-pop max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="eyebrow">Selected match</span>
                  <button onClick={() => setPicked(null)} aria-label="Close" className="pressable p-1 rounded-full" style={{ color: "var(--text-muted)" }}>
                    <X size={15} />
                  </button>
                </div>
                <MatchCard
                  tournament={t}
                  match={m}
                  onRecord={(a, b) => record(m, a, b)}
                  onPlay={() => onPlayMatch(m)}
                  onClear={() => undo(m)}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Changes: the audit trail, newest first */}
      {tab === "log" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Every result and correction. Saved with the event and included in an export, so the next person can see
            what was changed and when.
          </p>
          <ol className="grid gap-1.5 lg:grid-cols-2">
            {[...(t.log ?? [])].reverse().map((entry, i) => (
              <li
                key={`${entry.at}-${i}`}
                className="mat-thin flex items-start gap-3 px-3 py-2.5"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)" }}
              >
                <span className="tnum text-[11px] shrink-0 pt-0.5" style={{ color: "var(--text-muted)" }}>
                  {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span
                  className="text-sm min-w-0"
                  style={{ color: entry.kind === "edit" || entry.kind === "undo" ? "var(--yellow)" : "var(--text)" }}
                >
                  {entry.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      </div>

      {/* The rail. Standings are the thing people glance at between every
          match, so on a desktop they stop being a tab and become permanent -
          which also fills the 20rem that was empty on every other tab. */}
      <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-4">
        {isRotating ? (
          <StandingsTable rows={playerStandings(t)} title="Leaders" compact limit={10} />
        ) : hasPools ? (
          poolStandings(t).map(({ pool, rows }) => (
            <StandingsTable key={pool} rows={rows} title={`Pool ${pool}`} qualifyingCount={t.config.advancePerPool} compact />
          ))
        ) : (
          <StandingsTable rows={standings(t)} title="Standings" compact limit={12} />
        )}

        {onCourt.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow px-0.5">Courts</span>
            {onCourt.map((m) => (
              <div
                key={m.id}
                className="mat-thin flex items-center gap-2 px-2.5 py-2"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)" }}
              >
                <span className="tnum flex items-center justify-center w-6 h-6 shrink-0 text-[11px] font-bold"
                      style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 8 }}>
                  {m.court}
                </span>
                <span className="text-xs truncate min-w-0" style={{ color: "var(--text-secondary)" }}>
                  {nameOf(m.teamA)} v {nameOf(m.teamB)}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>
      </div>

      {sharingImage && champion && (
        <SharePanel
          title="Share the result"
          onClose={() => setSharingImage(false)}
          card={{
            kind: "tournament",
            eventName: t.name,
            championName: champion.name,
            standings: (isRotating ? playerStandings(t) : standings(t))
              .slice(0, 5)
              .map((r) => ({ rank: r.rank, name: r.name, wins: r.wins, losses: r.losses })),
          }}
        />
      )}

      {/* Export */}
      {exporting && (
        <div className="sheet-scrim fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4" onClick={() => setExporting(false)}>
          <div
            className="mat-thick sheet-rise w-full max-w-sm p-5"
            style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Export {t.name}</h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Results, standings and the change log, in whichever shape you need.
            </p>
            <div className="flex flex-col gap-2">
              {(Object.keys(EXPORT_INFO) as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => download(f)}
                  className="pressable hoverable mat-thin flex items-center gap-3 p-3 text-left"
                  style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)" }}
                >
                  <Download size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>{EXPORT_INFO[f].label}</span>
                    <span className="block text-xs" style={{ color: "var(--text-muted)" }}>{EXPORT_INFO[f].blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Teams ── */}
      {tab === "teams" && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {t.teams.map((team) => {
            const row = standings(t).find((r) => r.teamId === team.id);
            return (
              <div
                key={team.id}
                className="mat-thin flex items-center gap-3 p-3"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
              >
                <span className="tnum flex items-center justify-center w-8 h-8 shrink-0 text-sm font-bold"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", borderRadius: "var(--r-ctl)" }}>
                  {team.seed}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{team.name}</span>
                  <span className="block text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {team.playerIds.map((id) => t.players.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}
                  </span>
                </span>
                {row && row.played > 0 && (
                  <span className="tnum text-sm font-semibold shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {row.wins}-{row.losses}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Every match, grouped by round, with the finished ones collapsed in tone. */
function Schedule({
  tournament,
  onRecord,
  onPlay,
  onClear,
}: {
  tournament: Tournament;
  onRecord: (m: TournamentMatch, a: number, b: number) => void;
  onPlay: (m: TournamentMatch) => void;
  onClear: (m: TournamentMatch) => void;
}) {
  const matches = liveMatches(tournament);
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-5">
      {rounds.map((round) => {
        const inRound = matches.filter((m) => m.round === round);
        const pools = [...new Set(inRound.map((m) => m.pool ?? ""))];
        const doneCount = inRound.filter((m) => m.winner).length;
        return (
          <section key={round} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-0.5">
              <span className="eyebrow">
                {inRound[0].label && pools.length === 1 && !pools[0] ? inRound[0].label : `Round ${round}`}
              </span>
              <span className="tnum text-xs" style={{ color: "var(--text-muted)" }}>
                {doneCount}/{inRound.length}
              </span>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))" }}>
              {inRound.map((m) => (
                <MatchCard
                  key={m.id}
                  tournament={tournament}
                  match={m}
                  onRecord={(a, b) => onRecord(m, a, b)}
                  onPlay={() => onPlay(m)}
                  onClear={() => onClear(m)}
                />
              ))}
            </div>
          </section>
        );
      })}
      {rounds.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm py-8" style={{ color: "var(--text-muted)" }}>
          <Check size={15} /> Nothing scheduled yet.
        </p>
      )}
    </div>
  );
}
