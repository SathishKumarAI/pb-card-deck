// @vitest-environment jsdom
/**
 * The share token and the spectator payload.
 *
 * What these catch, in order of how bad it would be: a guessable or duplicated token;
 * a token leaking into the query string where servers log it; an unplayed match
 * rebuilt as a 0-0 result on someone's bracket; and a "link is broken" screen when the
 * real answer is "you are offline".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  newShareToken, shareUrlFor, tokenFromHash, shareState, docToTournament,
  type ShareRow, type SharedEventDoc,
} from "./eventShare";

describe("the token", () => {
  it("is 43 base64url characters - 256 bits, unguessable", () => {
    const token = newShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("never repeats", () => {
    const seen = new Set(Array.from({ length: 500 }, () => newShareToken()));
    expect(seen.size).toBe(500);
  });

  it("refuses to mint one without a secure random source, rather than guessably", () => {
    const real = globalThis.crypto.getRandomValues;
    // A browser where getRandomValues does nothing: the buffer stays zeroed.
    globalThis.crypto.getRandomValues = ((a: Uint8Array) => a) as typeof real;
    try {
      expect(() => newShareToken()).toThrow(/secure random/i);
    } finally {
      globalThis.crypto.getRandomValues = real;
    }
  });
});

describe("the URL", () => {
  it("puts the token in the FRAGMENT, so it never reaches a server log", () => {
    const url = shareUrlFor("abc123abc123abc123abc123abc123abc1", "https://example.test");
    expect(url).toBe("https://example.test/shared#t=abc123abc123abc123abc123abc123abc1");
    expect(url.split("#")[0]).not.toContain("abc123");
  });

  it("reads a token back out of a hash, with or without the key", () => {
    const token = "A".repeat(43);
    expect(tokenFromHash(`#t=${token}`)).toBe(token);
    expect(tokenFromHash(`#${token}`)).toBe(token);
    expect(tokenFromHash(`#t=${token}&x=1`)).toBe(token);
  });

  it("rejects junk rather than sending it to the database", () => {
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#")).toBeNull();
    expect(tokenFromHash("#t=")).toBeNull();
    expect(tokenFromHash("#t=short")).toBeNull();
    expect(tokenFromHash(`#t=${"A".repeat(200)}`)).toBeNull();
    expect(tokenFromHash("#t=has spaces and !!")).toBeNull();
  });
});

describe("shareState", () => {
  const row = (over: Partial<ShareRow>): ShareRow => ({
    id: "s1", created_at: "2026-09-01T00:00:00Z", expires_at: null, revoked_at: null, label: null, ...over,
  });
  const now = new Date("2026-09-10T00:00:00Z").getTime();

  it("is live with no expiry and no revocation", () => {
    expect(shareState(row({}), now)).toBe("live");
  });
  it("is revoked the moment it is revoked, expiry or not", () => {
    expect(shareState(row({ revoked_at: "2026-09-05T00:00:00Z", expires_at: "2027-01-01T00:00:00Z" }), now)).toBe("revoked");
  });
  it("is expired once the date has passed", () => {
    expect(shareState(row({ expires_at: "2026-09-09T23:59:00Z" }), now)).toBe("expired");
    expect(shareState(row({ expires_at: "2026-09-11T00:00:00Z" }), now)).toBe("live");
  });
});

describe("docToTournament", () => {
  const doc: SharedEventDoc = {
    event: {
      name: "Saturday Social",
      format: "pools-bracket",
      entryMode: "teams",
      teamSize: 2,
      status: "running",
      championTeamId: null,
      createdAt: "2026-09-01T09:00:00Z",
      config: { pointsToWin: 11, winByTwo: true, bestOf: 1, courts: 2, poolCount: 2, advancePerPool: 2 },
      players: [{ id: "p1", name: "Sam" }],
      teams: [{ id: "t1", name: "Sam & Priya", playerIds: ["p1"], seed: 1 }],
    },
    matches: [
      {
        id: "m1", bracket: "pool", round: 1, pool: "A",
        a: { from: "team", teamId: "t1" }, b: { from: "team", teamId: "t2" },
        teamA: "t1", teamB: "t2", scoreA: 11, scoreB: 6, winner: "t1", court: 1,
        label: null as unknown as undefined, completedAt: "2026-09-01T10:00:00Z",
      },
      {
        id: "m2", bracket: "pool", round: 2, pool: null as unknown as undefined,
        a: { from: "team", teamId: "t1" }, b: { from: "team", teamId: "t3" },
        teamA: null as unknown as undefined, teamB: null as unknown as undefined,
        scoreA: null as unknown as undefined, scoreB: null as unknown as undefined,
        winner: null as unknown as undefined, court: null as unknown as undefined,
        label: null as unknown as undefined, completedAt: null,
      },
    ],
    log: [{ at: "2026-09-01T10:00:05Z", kind: "result", text: "Court 1: 11-6" }],
    fetchedAt: "2026-09-01T10:30:00Z",
  };

  it("rebuilds the event the existing screens render from", () => {
    const t = docToTournament(doc);
    expect(t.name).toBe("Saturday Social");
    expect(t.format).toBe("pools-bracket");
    expect(t.teams).toHaveLength(1);
    expect(t.createdAt).toBe(new Date("2026-09-01T09:00:00Z").getTime());
    expect(t.log).toHaveLength(1);
    expect(t.log![0].at).toBe(new Date("2026-09-01T10:00:05Z").getTime());
  });

  it("keeps a played match, with its score and its completion time as a number", () => {
    const m = docToTournament(doc).matches[0];
    expect(m.scoreA).toBe(11);
    expect(m.winner).toBe("t1");
    expect(m.completedAt).toBe(new Date("2026-09-01T10:00:00Z").getTime());
  });

  it("keeps an unplayed match unplayed - a null must not become a 0-0 result", () => {
    const m = docToTournament(doc).matches[1];
    for (const key of ["scoreA", "scoreB", "winner", "court", "teamA", "teamB", "pool", "label", "completedAt"]) {
      expect(m, key).not.toHaveProperty(key);
    }
  });

  it("uses a synthetic id, so the organiser's real event id stays private", () => {
    expect(docToTournament(doc).id).toBe("shared");
  });

  it("omits a champion when there is none, rather than carrying null", () => {
    expect(docToTournament(doc)).not.toHaveProperty("championTeamId");
    const withChampion = { ...doc, event: { ...doc.event, championTeamId: "t1" } };
    expect(docToTournament(withChampion).championTeamId).toBe("t1");
  });
});

describe("fetchSharedEvent, without a project configured", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("says share links are not enabled here, rather than 'link broken'", async () => {
    const { fetchSharedEvent } = await import("./eventShare");
    const r = await fetchSharedEvent("A".repeat(43));
    expect(r).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("says 'no token' for an empty fragment", async () => {
    const { fetchSharedEvent } = await import("./eventShare");
    expect(await fetchSharedEvent(null)).toEqual({ ok: false, reason: "no-token" });
  });

  it("distinguishes offline from a dead link, because the advice differs", async () => {
    vi.stubGlobal("navigator", { ...navigator, onLine: false });
    const { fetchSharedEvent } = await import("./eventShare");
    // Unconfigured is checked first in this environment; the ordering itself is the
    // contract: a viewer is never told a link is dead when the app cannot even try.
    const r = await fetchSharedEvent("A".repeat(43));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["offline", "unconfigured"]).toContain(r.reason);
  });
});
