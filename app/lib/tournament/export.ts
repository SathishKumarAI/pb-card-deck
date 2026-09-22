/**
 * Getting an event out of the app.
 *
 * Owns the four shapes people actually ask for and nothing else - no DOM, no
 * download plumbing (that is `download()` in the panel). Every format carries
 * the same facts: the teams, every match with its score, the standings, and
 * the change log, because a result without its corrections is not a record.
 *
 * CSV is the one that matters most: it opens in Excel, Numbers and Sheets with
 * no import step, which is what "send me the results" usually means.
 */

import type { Tournament, TournamentMatch } from "./types";
import { DIVISION_INFO, FORMAT_INFO } from "./types";
import { standings, poolStandings, playerStandings } from "./standings";
import { liveMatches, progress } from "./engine";

export type ExportFormat = "csv" | "json" | "markdown" | "txt";

export const EXPORT_INFO: Record<ExportFormat, { label: string; blurb: string; ext: string; mime: string }> = {
  csv: { label: "CSV", blurb: "Opens in Excel, Numbers or Sheets", ext: "csv", mime: "text/csv" },
  markdown: { label: "Markdown", blurb: "For a write-up or a README", ext: "md", mime: "text/markdown" },
  json: { label: "JSON", blurb: "Everything, exactly as stored", ext: "json", mime: "application/json" },
  txt: { label: "Text", blurb: "Paste into a group chat", ext: "txt", mime: "text/plain" },
};

const when = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "");
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function teamName(t: Tournament, id?: string) {
  return t.teams.find((x) => x.id === id)?.name ?? "";
}

function matchStage(m: TournamentMatch) {
  return m.label ?? (m.pool ? `Pool ${m.pool}` : `Round ${m.round}`);
}

/** A cell that will not break a spreadsheet: quotes doubled, whole field quoted. */
function cell(value: string | number | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(t: Tournament): string {
  const rows: string[] = [];

  rows.push(cell(`${t.name} - ${FORMAT_INFO[t.format].label}`));
  rows.push("");
  rows.push(["Stage", "Court", "Team A", "Score A", "Score B", "Team B", "Winner", "Finished"].map(cell).join(","));
  for (const m of liveMatches(t)) {
    rows.push(
      [
        matchStage(m),
        m.court ?? "",
        teamName(t, m.teamA),
        m.scoreA ?? "",
        m.scoreB ?? "",
        teamName(t, m.teamB),
        teamName(t, m.winner),
        when(m.completedAt),
      ]
        .map(cell)
        .join(","),
    );
  }

  rows.push("");
  rows.push(["Rank", "Team", "Played", "Won", "Lost", "Points for", "Points against", "Difference", "Pool"].map(cell).join(","));
  const tables = t.entryMode === "rotating"
    ? [{ pool: "", rows: playerStandings(t) }]
    : t.matches.some((m) => m.pool)
      ? poolStandings(t)
      : [{ pool: "", rows: standings(t) }];
  for (const { pool, rows: table } of tables) {
    for (const r of table) {
      rows.push([r.rank, r.name, r.played, r.wins, r.losses, r.pointsFor, r.pointsAgainst, r.diff, pool].map(cell).join(","));
    }
  }

  if (t.log?.length) {
    rows.push("");
    rows.push(["Time", "Change"].map(cell).join(","));
    for (const l of t.log) rows.push([when(l.at), l.text].map(cell).join(","));
  }

  return rows.join("\n");
}

export function toMarkdown(t: Tournament): string {
  const out: string[] = [];
  const { played, total } = progress(t);
  const division = t.config.division && t.config.division !== "open" ? ` · ${DIVISION_INFO[t.config.division].label}` : "";

  out.push(`# ${t.name}`, "");
  out.push(`${FORMAT_INFO[t.format].label}${division} · ${played}/${total} matches played · ${when(t.createdAt)}`, "");

  const champion = t.teams.find((x) => x.id === t.championTeamId);
  if (champion) out.push(`**Winner: ${champion.name}**`, "");

  const tables = t.entryMode === "rotating"
    ? [{ pool: "Players", rows: playerStandings(t) }]
    : t.matches.some((m) => m.pool)
      ? poolStandings(t).map((x) => ({ pool: `Pool ${x.pool}`, rows: x.rows }))
      : [{ pool: "Standings", rows: standings(t) }];

  for (const { pool, rows } of tables) {
    out.push(`## ${pool}`, "");
    out.push("| # | Team | W | L | PF | PA | +/- |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const r of rows) {
      out.push(`| ${r.rank} | ${r.name} | ${r.wins} | ${r.losses} | ${r.pointsFor} | ${r.pointsAgainst} | ${r.diff > 0 ? "+" : ""}${r.diff} |`);
    }
    out.push("");
  }

  out.push("## Results", "");
  out.push("| Stage | Match | Score |", "| --- | --- | --- |");
  for (const m of liveMatches(t).filter((m) => m.winner)) {
    out.push(`| ${matchStage(m)} | ${teamName(t, m.teamA)} v ${teamName(t, m.teamB)} | ${m.scoreA}-${m.scoreB} |`);
  }
  out.push("");

  if (t.log?.length) {
    out.push("## Changes", "");
    for (const l of t.log) out.push(`- \`${time(l.at)}\` ${l.text}`);
    out.push("");
  }

  return out.join("\n");
}

export function toText(t: Tournament): string {
  const lines = [`${t.name} - ${FORMAT_INFO[t.format].label}`, ""];
  const table = t.entryMode === "rotating" ? playerStandings(t) : standings(t);
  table.slice(0, 20).forEach((r) => {
    lines.push(`${r.rank}. ${r.name}  ${r.wins}-${r.losses}  ${r.diff > 0 ? "+" : ""}${r.diff}`);
  });
  const champion = t.teams.find((x) => x.id === t.championTeamId);
  if (champion) lines.push("", `Winner: ${champion.name}`);
  return lines.join("\n");
}

export function toJson(t: Tournament): string {
  return JSON.stringify(t, null, 2);
}

export function exportTournament(t: Tournament, format: ExportFormat): string {
  switch (format) {
    case "csv": return toCsv(t);
    case "markdown": return toMarkdown(t);
    case "json": return toJson(t);
    case "txt": return toText(t);
  }
}

/** A filename that sorts by date and survives every filesystem. */
export function exportFilename(t: Tournament, format: ExportFormat): string {
  const safe = t.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "tournament";
  const date = new Date(t.createdAt).toISOString().slice(0, 10);
  return `${safe}-${date}.${EXPORT_INFO[format].ext}`;
}
