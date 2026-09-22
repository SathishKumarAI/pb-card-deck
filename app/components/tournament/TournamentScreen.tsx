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
  const toast = useToast();

  const t = tournament;
  const isRotating = t.format === "rotating";
  const hasBracket = t.matches.some((m) => m.bracket === "winners" || m.bracket === "losers" || m.bracket === "final");
  const hasPools = t.matches.some((m) => m.bracket === "pool");

  const playable = useMemo(() => playableMatches(t), [t]);
  const onCourt = playable.filter((m) => m.court);
  const upNext = playable.filter((m) => !m.court).slice(0, 6);
  const { played, total } = progress(t);
  const champion = t.teams.find((x) => x.id === t.championTeamId);

  const record = (m: TournamentMatch, a: number, b: number) => {
    onChange(recordResult(t, m.id, a, b));
    toast("Result saved");
  };
  const undo = (m: TournamentMatch) => {
    onChange(clearResult(t, m.id));
    toast("Result cleared");
  };

  const tabs: { key: Tab; label: string; icon: typeof ListChecks; show: boolean }[] = [
    { key: "now", label: "On now", icon: ListChecks, show: true },
    { key: "schedule", label: "Schedule", icon: Table2, show: true },
    { key: "table", label: isRotating ? "Players" : "Standings", icon: Trophy, show: true },
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
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ title: t.name, text });
      else { await navigator.clipboard.writeText(text); toast("Standings copied"); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onExit} className="pressable flex items-center gap-1.5 text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft size={16} /> All events
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-black leading-tight truncate" style={{ color: "var(--text)" }}>
            {t.name}
          </h1>
          <p className="text-xs mt-1 tnum" style={{ color: "var(--text-muted)" }}>
            {FORMAT_INFO[t.format].label}
            {t.config.division && t.config.division !== "open" ? ` · ${DIVISION_INFO[t.config.division].label}` : ""}
            {" · "}
            {isRotating ? `${t.players.length} players` : `${t.teams.length} teams`} · {played}/{total} matches
          </p>
        </div>
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

      {/* Progress rail */}
      <div className="h-1.5 w-full overflow-hidden" style={{ background: "var(--bg-elevated)", borderRadius: 999 }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${total ? (played / total) * 100 : 0}%`, background: "var(--accent)" }}
        />
      </div>

      {champion && (
        <div
          className="anim-pop flex items-center gap-3 p-4"
          style={{ border: "1px solid var(--yellow)", borderRadius: "var(--r-panel)", background: "color-mix(in srgb, var(--yellow) 10%, transparent)" }}
        >
          <Trophy size={26} style={{ color: "var(--yellow)" }} />
          <div className="min-w-0">
            <div className="eyebrow">Champion</div>
            <div className="font-display text-xl font-black truncate" style={{ color: "var(--text)" }}>{champion.name}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mat-thin flex gap-1 p-1 overflow-x-auto scroll-area" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
        {tabs.filter((x) => x.show).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className="pressable flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
            style={tab === key ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--text-secondary)" }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

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
              <div className="grid gap-2 sm:grid-cols-2">
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
              <div className="grid gap-2 sm:grid-cols-2">
                {upNext.map((m) => (
                  <MatchCard key={m.id} tournament={t} match={m} onRecord={(a, b) => record(m, a, b)} onPlay={() => onPlayMatch(m)} />
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
          <ol className="flex flex-col gap-1.5">
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
        <div className="grid gap-2 sm:grid-cols-2">
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
            <div className="grid gap-2 sm:grid-cols-2">
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
