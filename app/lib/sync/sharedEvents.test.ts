// @vitest-environment jsdom
/**
 * Events held on this device that belong to somebody else (phase 2c).
 *
 * The engine test below is the one that matters: pushing a shared event's HEADER is
 * refused by policy, so sending it would fail the whole entity on every sync and
 * eventually dead-letter the event — the helper's scores would stop travelling, and the
 * only symptom would be a "Not synced" chip.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  markSharedEvent, markOwnEvent, isSharedEvent, sharedEventOwner,
  listSharedEventIds, clearSharedEvents,
} from "./sharedEvents";
import { syncNow, startSyncing, stopSyncing, type Transport } from "./engine";
import { setSyncEnabled, clearOutbox } from "./outbox";
import { saveTournament } from "../store/tournaments";
import { buildDemoTournament } from "../tournament/demo";
import { eventToHeaderRow } from "./eventRows";

const ME = "me-1111";
const OWNER = "owner-2222";

beforeEach(() => {
  localStorage.clear();
  clearSharedEvents();
  clearOutbox();
  setSyncEnabled(true);
});

describe("the map of events that are not ours", () => {
  it("starts empty - the normal case is that everything is yours", () => {
    expect(isSharedEvent("e1")).toBe(false);
    expect(listSharedEventIds()).toEqual([]);
  });

  it("remembers who owns a shared event", () => {
    markSharedEvent("e1", OWNER);
    expect(isSharedEvent("e1")).toBe(true);
    expect(sharedEventOwner("e1")).toBe(OWNER);
  });

  it("can take an event back, for an ownership change or a re-pull", () => {
    markSharedEvent("e1", OWNER);
    markOwnEvent("e1");
    expect(isSharedEvent("e1")).toBe(false);
    expect(sharedEventOwner("e1")).toBeNull();
  });

  it("is cleared on sign-out, like the rest of the sync bookkeeping", () => {
    markSharedEvent("e1", OWNER);
    stopSyncing();
    expect(isSharedEvent("e1")).toBe(false);
  });
});

describe("pushing an event that is not ours", () => {
  function recordingTransport() {
    const tables: string[] = [];
    const t: Transport = {
      async upsert(table) { tables.push(table); },
      async softDelete() {},
      async pull() { return []; },
      async pullChildren() { return []; },
    };
    return { t, tables };
  }

  it("sends matches and log lines, and NOT the header", async () => {
    startSyncing(ME);
    const event = buildDemoTournament();
    saveTournament(event);
    markSharedEvent(event.id, OWNER);

    const { t, tables } = recordingTransport();
    await syncNow(t);

    expect(tables, "the owner's header must not be pushed by a helper").not.toContain("tournaments");
    expect(tables).toContain("tournament_matches");
    expect(tables).toContain("event_log");
  });

  it("sends the header for an event that IS ours", async () => {
    startSyncing(ME);
    const event = buildDemoTournament();
    saveTournament(event);

    const { t, tables } = recordingTransport();
    await syncNow(t);

    expect(tables[0]).toBe("tournaments");
  });
});

describe("pulling", () => {
  function pullingTransport(ownerId: string) {
    const event = { ...buildDemoTournament(), id: "from-elsewhere" };
    const header = {
      ...eventToHeaderRow(event),
      user_id: ownerId,
      updated_at: "2026-09-20T10:00:00Z",
    } as unknown as Record<string, unknown>;
    const t: Transport = {
      async upsert() {},
      async softDelete() {},
      async pull(table) { return table === "tournaments" ? [header] : []; },
      async pullChildren() { return []; },
    };
    return t;
  }

  it("marks an event whose owner is somebody else", async () => {
    startSyncing(ME);
    await syncNow(pullingTransport(OWNER));
    expect(isSharedEvent("from-elsewhere")).toBe(true);
    expect(sharedEventOwner("from-elsewhere")).toBe(OWNER);
  });

  it("does not mark our own event, however it arrived", async () => {
    startSyncing(ME);
    await syncNow(pullingTransport(ME));
    expect(isSharedEvent("from-elsewhere")).toBe(false);
  });

  it("treats an event as ours when there is no session to compare against", async () => {
    // The conservative answer: it keeps the pre-2c single-user behaviour rather than
    // silently deciding somebody else owns your data.
    startSyncing(null);
    await syncNow(pullingTransport(OWNER));
    expect(isSharedEvent("from-elsewhere")).toBe(false);
  });
});
