// @vitest-environment jsdom
/**
 * A real event, split across three tables and put back together.
 *
 * The fixture is the demo event, which is built by playing a 12-team day through the
 * actual engine - so this round-trips real slot wiring, byes, resolved teams, scores,
 * courts, a champion and a change log, rather than a hand-written object that happens
 * to match the mapping.
 *
 * What it catches: a field dropped in either direction. That failure is invisible in
 * the app - the event still opens, it just quietly loses a court number, or a
 * correction, or the "not played yet" state of a match.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  eventToHeaderRow, eventToMatchRows, unsentLogRows, rowsToTournament,
  logSentCount, setLogSentCount,
} from "./eventRows";
import { buildDemoTournament } from "../tournament/demo";
import type { Tournament } from "../tournament/types";

beforeEach(() => localStorage.clear());

function demo(): Tournament {
  return buildDemoTournament();
}

describe("a played-through event survives the round trip", () => {
  it("rebuilds every field the app reads", () => {
    const t = demo();
    const back = rowsToTournament(eventToHeaderRow(t), eventToMatchRows(t), unsentLogRows(t));

    expect(back.id).toBe(t.id);
    expect(back.name).toBe(t.name);
    expect(back.format).toBe(t.format);
    expect(back.entryMode).toBe(t.entryMode);
    expect(back.teamSize).toBe(t.teamSize);
    expect(back.status).toBe(t.status);
    expect(back.championTeamId).toBe(t.championTeamId);
    expect(back.createdAt).toBe(t.createdAt);
    expect(back.config).toEqual(t.config);
    expect(back.players).toEqual(t.players);
    expect(back.teams).toEqual(t.teams);
    expect(back.matches).toHaveLength(t.matches.length);
  });

  it("keeps every match identical, slot wiring included", () => {
    const t = demo();
    const back = rowsToTournament(eventToHeaderRow(t), eventToMatchRows(t), []);
    for (const original of t.matches) {
      const copy = back.matches.find((m) => m.id === original.id);
      expect(copy, `match ${original.id} vanished`).toBeTruthy();
      expect(copy).toEqual(original);
    }
  });

  it("keeps an unplayed match unplayed, instead of turning it into 0-0", () => {
    const t = demo();
    const unplayed = t.matches.find((m) => m.scoreA === undefined);
    expect(unplayed, "the demo should contain a match that has not been played").toBeTruthy();
    const back = rowsToTournament(eventToHeaderRow(t), eventToMatchRows(t), []);
    const copy = back.matches.find((m) => m.id === unplayed!.id)!;
    expect(copy).not.toHaveProperty("scoreA");
    expect(copy).not.toHaveProperty("winner");
  });

  it("keeps the change log in order, and keeps each line's match link", () => {
    const t = demo();
    expect((t.log ?? []).length).toBeGreaterThan(0);
    const back = rowsToTournament(eventToHeaderRow(t), eventToMatchRows(t), unsentLogRows(t));
    expect(back.log).toHaveLength(t.log!.length);
    expect(back.log!.map((l) => l.text)).toEqual(t.log!.map((l) => l.text));
    expect(back.log!.map((l) => l.kind)).toEqual(t.log!.map((l) => l.kind));
    // A line that names a match must still name the SAME match after the trip
    // through cloud uuids and back.
    const linked = t.log!.findIndex((l) => l.matchId);
    if (linked >= 0) expect(back.log![linked].matchId).toBe(t.log![linked].matchId);
  });
});

describe("the append-only log", () => {
  it("sends each line exactly once", () => {
    const t = demo();
    const first = unsentLogRows(t);
    expect(first.length).toBe(t.log!.length);

    setLogSentCount(t.id, t.log!.length);
    expect(unsentLogRows(t)).toHaveLength(0);

    // A correction appends one line; only that line is sent.
    const withCorrection: Tournament = {
      ...t,
      log: [...t.log!, { at: Date.now(), kind: "edit", text: "Court 1: 11-9 (was 11-6)" }],
    };
    const second = unsentLogRows(withCorrection);
    expect(second).toHaveLength(1);
    expect(second[0].text).toBe("Court 1: 11-9 (was 11-6)");
  });

  it("gives every line a stable id, so a retry cannot duplicate it", () => {
    const t = demo();
    const a = unsentLogRows(t).map((r) => r.id);
    const b = unsentLogRows(t).map((r) => r.id);
    expect(b).toEqual(a);
    expect(new Set(a).size).toBe(a.length);
  });

  it("never lets the sent count go backwards", () => {
    setLogSentCount("e1", 5);
    setLogSentCount("e1", 2);
    expect(logSentCount("e1")).toBe(5);
  });

  it("truncates a line rather than having the row refused", () => {
    const t = demo();
    const long: Tournament = { ...t, log: [{ at: Date.now(), kind: "note", text: "x".repeat(900) }] };
    setLogSentCount(long.id, 0);
    expect(unsentLogRows(long)[0].text).toHaveLength(500);
  });
});

describe("ids", () => {
  it("gives the header and its matches stable, distinct uuids", () => {
    const t = demo();
    const header1 = eventToHeaderRow(t).id;
    const header2 = eventToHeaderRow(t).id;
    expect(header2).toBe(header1);
    expect(header1).toMatch(/^[0-9a-f-]{36}$/);

    const rows = eventToMatchRows(t);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.every((r) => r.tournament_id === header1)).toBe(true);
  });

  it("does not collide across two events that share a match id", () => {
    const a = { ...demo(), id: "event-a" };
    const b = { ...demo(), id: "event-b" };
    const idsA = eventToMatchRows(a).map((r) => r.id);
    const idsB = eventToMatchRows(b).map((r) => r.id);
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });
});

describe("values the columns would refuse", () => {
  it("normalises an unknown format and an over-long name", () => {
    const t = demo();
    const row = eventToHeaderRow({ ...t, name: "n".repeat(300), format: "ladder" as never });
    expect(row.name).toHaveLength(120);
    expect(row.format).toBe("round-robin");
  });

  it("clamps a court and a score that are out of range", () => {
    const t = demo();
    const broken: Tournament = {
      ...t,
      matches: [{ ...t.matches[0], court: 900, scoreA: 5000, round: 0 }],
    };
    const row = eventToMatchRows(broken)[0];
    expect(row.court).toBe(64);
    expect(row.score_a).toBe(999);
    expect(row.round).toBe(1);
  });
});
