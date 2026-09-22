"use client";

/**
 * Standings. Owns how a table LOOKS; lib/tournament/standings.ts owns what is
 * in it. Wide screens get the full set of columns, a phone keeps W-L and the
 * difference, because those are the two people argue about.
 */

import type { StandingRow } from "@/lib/tournament/types";

export default function StandingsTable({
  rows,
  title,
  /** Rows above this line qualify; draws a rule under the last one. */
  qualifyingCount,
  highlightId,
  /** Sidebar variant: rank, name, W-L and difference only. */
  compact = false,
  /** Cap the rows shown, with a count of the rest. */
  limit,
}: {
  rows: StandingRow[];
  title?: string;
  qualifyingCount?: number;
  highlightId?: string;
  compact?: boolean;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;

  if (rows.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
        Nothing played yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {title && <span className="eyebrow px-0.5">{title}</span>}
      <div className="mat-thin overflow-hidden" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="text-left font-semibold px-2.5 py-1.5 text-[11px] w-7">#</th>
              <th className="text-left font-semibold px-1 py-1.5 text-[11px]">Team</th>
              <th className="text-right font-semibold px-2 py-1.5 text-[11px]">{compact ? "W-L" : "W"}</th>
              {!compact && <th className="text-right font-semibold px-2 py-1.5 text-[11px]">L</th>}
              {!compact && <th className="text-right font-semibold px-2 py-1.5 text-[11px] hidden sm:table-cell">PF</th>}
              {!compact && <th className="text-right font-semibold px-2 py-1.5 text-[11px] hidden sm:table-cell">PA</th>}
              <th className="text-right font-semibold px-2.5 py-1.5 text-[11px]">+/−</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => {
              const qualifies = qualifyingCount != null && i < qualifyingCount;
              return (
                <tr
                  key={row.teamId}
                  style={{
                    borderTop: "1px solid var(--mat-edge)",
                    borderBottom:
                      qualifyingCount != null && i === qualifyingCount - 1 ? "2px solid var(--accent)" : undefined,
                    background:
                      row.teamId === highlightId ? "color-mix(in srgb, var(--accent) 12%, transparent)" : undefined,
                  }}
                >
                  <td className="tnum px-2.5 py-2 text-xs" style={{ color: qualifies ? "var(--accent)" : "var(--text-muted)" }}>
                    {row.rank}
                  </td>
                  <td className="px-1 py-2 font-medium truncate max-w-[10rem]" style={{ color: "var(--text)" }}>
                    {row.name}
                  </td>
                  <td className="tnum px-2 py-2 text-right font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>
                    {compact ? `${row.wins}-${row.losses}` : row.wins}
                  </td>
                  {!compact && <td className="tnum px-2 py-2 text-right" style={{ color: "var(--text-secondary)" }}>{row.losses}</td>}
                  {!compact && <td className="tnum px-2 py-2 text-right hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{row.pointsFor}</td>}
                  {!compact && <td className="tnum px-2 py-2 text-right hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{row.pointsAgainst}</td>}
                  <td
                    className="tnum px-2.5 py-2 text-right font-semibold"
                    style={{ color: row.diff > 0 ? "var(--accent)" : row.diff < 0 ? "var(--text-muted)" : "var(--text-secondary)" }}
                  >
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {limit && rows.length > limit && (
          <p className="px-2.5 py-2 text-[11px]" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mat-edge)" }}>
            +{rows.length - limit} more
          </p>
        )}
      </div>
    </div>
  );
}
