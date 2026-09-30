// @vitest-environment jsdom
/**
 * The sync engine against a fake transport, so every rule that decides whose data
 * survives is checked here rather than discovered on someone's phone.
 *
 * Each test is named for what a user would see if the rule broke.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { syncNow, getCursor, startSyncing, stopSyncing, getSyncStatus, describeStuck, type Transport } from "./engine";
import { enqueue, listOutbox, setSyncEnabled, clearOutbox, markFailed, MAX_TRIES } from "./outbox";
import { saveDeck, listDecks, applyRemoteDeck } from "../store/decks";
import { listMatches, applyRemoteMatch } from "../store/matches";
import { listFavoriteIds, toggleFavorite, getStats, bumpStat } from "../store/prefs";
import { cloudIdFor } from "./idmap";

/** A transport that records what it was asked to do and replays what you seed. */
function fakeTransport(seed: Record<string, Record<string, unknown>[]> = {}) {
  const calls = { upserts: [] as { table: string; rows: Record<string, unknown>[] }[], deletes: [] as { table: string; ids: string[] }[], pulls: [] as string[] };
  const remote: Record<string, Record<string, unknown>[]> = { decks: [], matches: [], prefs: [], ...seed };
  const t: Transport = {
    async upsert(table, rows) { calls.upserts.push({ table, rows }); },
    async softDelete(table, ids) { calls.deletes.push({ table, ids }); },
    async pull(table) { calls.pulls.push(table); return remote[table] ?? []; },
  };
  return { t, calls, remote };
}

function failingTransport(): Transport {
  return {
    async upsert() { throw new Error("upsert refused"); },
    async softDelete() { throw new Error("delete refused"); },
    async pull() { return []; },
  };
}

beforeEach(() => {
  localStorage.clear();
  // The engine's status is module state, so without this a later test inherits an
  // earlier one's lastSyncedAt - which is exactly how the error test first "passed"
  // for the wrong reason.
  stopSyncing();
  clearOutbox();
  setSyncEnabled(true);
  startSyncing();
});

describe("pushing", () => {
  it("sends a deck someone created, once", async () => {
    const deck = saveDeck({ name: "Dinks", description: "soft", cards: [] });
    const { t, calls } = fakeTransport();
    await syncNow(t);
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0].table).toBe("decks");
    expect(calls.upserts[0].rows[0]).toMatchObject({ client_id: deck.id, name: "Dinks" });
    expect(listOutbox()).toHaveLength(0);
  });

  it("never sends user_id or updated_at - the database owns both", async () => {
    saveDeck({ name: "D", description: "", cards: [] });
    const { t, calls } = fakeTransport();
    await syncNow(t);
    const row = calls.upserts[0].rows[0];
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("updated_at");
  });

  it("tombstones a deleted deck, so the delete reaches the other device", async () => {
    const deck = saveDeck({ name: "Gone", description: "", cards: [] });
    const cloudId = cloudIdFor("decks", deck.id);
    const { t: t1 } = fakeTransport();
    await syncNow(t1);
    const { deleteDeck } = await import("../store/decks");
    deleteDeck(deck.id);
    const { t, calls } = fakeTransport();
    await syncNow(t);
    expect(calls.deletes).toEqual([{ table: "decks", ids: [cloudId] }]);
  });

  it("reuses one cloud id for a row edited many times, instead of inserting copies", () => {
    const first = cloudIdFor("matches", "local-1");
    expect(cloudIdFor("matches", "local-1")).toBe(first);
    expect(cloudIdFor("matches", "local-2")).not.toBe(first);
  });

  it("one bad entity does not hold the others hostage", async () => {
    saveDeck({ name: "D", description: "", cards: [] });
    toggleFavorite(7);
    let call = 0;
    const t: Transport = {
      async upsert(table) { call++; if (table === "decks") throw new Error("check constraint"); },
      async softDelete() {}, async pull() { return []; },
    };
    await syncNow(t);
    expect(call).toBeGreaterThan(1);
    // The deck is still queued (and now has a try against it); prefs went.
    const left = listOutbox();
    expect(left.map((e) => e.entity)).toEqual(["decks"]);
    expect(left[0].tries).toBe(1);
  });
});

describe("pulling", () => {
  it("brings in a match made on another device", async () => {
    const { t } = fakeTransport({
      matches: [{
        id: "11111111-1111-4111-8111-111111111111", client_id: "other-1", mode: "chaos",
        team1_name: "A", team2_name: "B", score_team1: 11, score_team2: 7, winner: 1,
        game_number: 1, duration_ms: 600000, results: [], official: false,
        event_label: null, game_type: null, timeouts: null, faults: null,
        played_at: "2026-09-01T10:00:00Z", created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-09-01T10:00:05Z",
      }],
    });
    await syncNow(t);
    const local = listMatches();
    expect(local).toHaveLength(1);
    expect(local[0]).toMatchObject({ id: "other-1", team1_name: "A", score_team1: 11 });
    expect(getCursor("matches")).toBe("2026-09-01T10:00:05Z");
  });

  it("does not mark a casual match as officiated when pulling it back", async () => {
    const { t } = fakeTransport({
      matches: [{
        id: "22222222-2222-4222-8222-222222222222", client_id: "c-1", mode: "family",
        team1_name: "A", team2_name: "B", score_team1: 11, score_team2: 9, winner: 1,
        game_number: 1, duration_ms: 1000, results: [], official: false,
        event_label: null, game_type: null, timeouts: null, faults: null,
        played_at: "2026-09-02T10:00:00Z", created_at: "2026-09-02T10:00:00Z",
        updated_at: "2026-09-02T10:00:00Z",
      }],
    });
    await syncNow(t);
    expect(listMatches()[0]).not.toHaveProperty("official");
  });

  it("applies a tombstone by removing the local row", async () => {
    applyRemoteMatch({
      id: "doomed", mode: "chaos", team1_name: "A", team2_name: "B",
      score_team1: 1, score_team2: 0, winner: null, game_number: 1,
      duration_ms: 0, results: [], created_at: Date.now(),
    });
    expect(listMatches()).toHaveLength(1);
    const { t } = fakeTransport({
      matches: [{
        id: "33333333-3333-4333-8333-333333333333", client_id: "doomed", mode: "chaos",
        team1_name: "A", team2_name: "B", score_team1: 1, score_team2: 0, winner: null,
        game_number: 1, duration_ms: 0, results: [], official: false,
        event_label: null, game_type: null, timeouts: null, faults: null,
        played_at: "2026-09-03T10:00:00Z", created_at: "2026-09-03T10:00:00Z",
        updated_at: "2026-09-03T11:00:00Z", deleted_at: "2026-09-03T11:00:00Z",
      }],
    });
    await syncNow(t);
    expect(listMatches()).toHaveLength(0);
  });

  it("a write that lands mid-sync is not clobbered by the pull in the same run", async () => {
    /* The race the rule exists for: someone renames a deck after the push has gone
       and before the pull comes back. The server copy is genuinely older, and
       overwriting the local row would silently undo a rename the user just made.
       (After a SUCCESSFUL push with no later write, the server's row IS ours, so
       pulling it back is harmless - which is why the rule is about the queue, not
       about timestamps.) */
    applyRemoteDeck({ id: "d9", name: "Server name", description: "", cards: [], created_at: 1 });
    const seeded = {
      decks: [{
        id: "44444444-4444-4444-8444-444444444444", client_id: "d9", name: "Server name",
        description: null, cards: [], created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-04T00:00:00Z",
      }],
    };
    const calls: string[] = [];
    const t: Transport = {
      async upsert(table) {
        calls.push(table);
        // The user renames the deck right here, between push and pull.
        applyRemoteDeck({ id: "d9", name: "Renamed on this phone", description: "", cards: [], created_at: 1 });
        enqueue("decks", "d9");
      },
      async softDelete() {},
      async pull(table) { return (seeded as Record<string, Record<string, unknown>[]>)[table] ?? []; },
    };
    enqueue("decks", "d9");
    await syncNow(t);
    expect(calls).toContain("decks");
    expect(listDecks()[0].name).toBe("Renamed on this phone");
  });

  it("merges prefs instead of letting one device win", async () => {
    toggleFavorite(1);
    bumpStat("draws", 10);
    const { t } = fakeTransport({
      prefs: [{ data: { favorites: [2], stats: { draws: 3, legendary: 1 } }, updated_at: "2026-09-05T00:00:00Z" }],
    });
    await syncNow(t);
    expect(listFavoriteIds().sort()).toEqual([1, 2]);
    // A counter must never go backwards because the other phone was behind.
    expect(getStats()).toMatchObject({ draws: 10, legendary: 1 });
  });

  it("never moves a cursor backwards", async () => {
    const { t } = fakeTransport({
      decks: [
        { id: "a", client_id: "a", name: "A", description: null, cards: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" },
        { id: "b", client_id: "b", name: "B", description: null, cards: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-09-08T00:00:00Z" },
      ],
    });
    await syncNow(t);
    expect(getCursor("decks")).toBe("2026-09-09T00:00:00Z");
  });
});

describe("status", () => {
  it("says synced when the queue is empty", async () => {
    const { t } = fakeTransport();
    await syncNow(t);
    expect(getSyncStatus().phase).toBe("idle");
    expect(getSyncStatus().pending).toBe(0);
    expect(getSyncStatus().lastSyncedAt).not.toBeNull();
  });

  it("reports an error, and does not claim a successful sync time", async () => {
    saveDeck({ name: "D", description: "", cards: [] });
    let now = Date.now();
    for (let i = 0; i < MAX_TRIES; i++) { markFailed(listOutbox(), "refused", now); now += 10 * 60 * 1000; }
    await syncNow(failingTransport(), now);
    const s = getSyncStatus();
    expect(s.phase).toBe("error");
    expect(s.error).toMatch(/could not sync/i);
    expect(s.lastSyncedAt).toBeNull();
  });

  it("names what is stuck rather than just failing", () => {
    expect(describeStuck([
      { seq: 1, id: "1", entity: "decks", op: "upsert", at: 0, tries: 8 },
      { seq: 2, id: "2", entity: "matches", op: "upsert", at: 0, tries: 8 },
      { seq: 3, id: "3", entity: "matches", op: "upsert", at: 0, tries: 8 },
    ])).toBe("Could not sync 1 decks, 2 matches. Everything is still safe on this device.");
  });

  it("signing out clears the queue and the cursors but keeps the data", async () => {
    saveDeck({ name: "Mine", description: "", cards: [] });
    const { t } = fakeTransport();
    await syncNow(t);
    stopSyncing();
    expect(getSyncStatus().phase).toBe("off");
    expect(listOutbox()).toHaveLength(0);
    expect(getCursor("decks")).toBeNull();
    expect(listDecks(), "signing out must not empty someone's device").toHaveLength(1);
  });
});
