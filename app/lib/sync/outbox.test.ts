// @vitest-environment jsdom
/**
 * The queue's four rules, each named for the failure it prevents.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue, listOutbox, due, deadLettered, backoffMs, markSent, markFailed,
  retryAll, pendingCount, clearOutbox, setSyncEnabled, isSyncEnabled,
  MAX_ENTRIES, MAX_TRIES,
} from "./outbox";

beforeEach(() => {
  localStorage.clear();
  clearOutbox();
  setSyncEnabled(true);
});

describe("queueing", () => {
  it("queues nothing at all for a player with no account", () => {
    setSyncEnabled(false);
    enqueue("matches", "m1");
    expect(isSyncEnabled()).toBe(false);
    expect(pendingCount()).toBe(0);
  });

  it("keeps one entry per row, so editing a deck eight times is one push", () => {
    for (let i = 0; i < 8; i++) enqueue("decks", "d1");
    expect(listOutbox()).toHaveLength(1);
  });

  it("keeps a delete and an upsert of DIFFERENT rows apart", () => {
    enqueue("decks", "d1");
    enqueue("decks", "d2", "delete");
    expect(listOutbox().map((e) => e.op)).toEqual(["upsert", "delete"]);
  });

  it("lets a later delete replace an earlier upsert of the same row", () => {
    enqueue("matches", "m1");
    enqueue("matches", "m1", "delete");
    expect(listOutbox()).toHaveLength(1);
    expect(listOutbox()[0].op).toBe("delete");
  });

  it("separates the same id in different entities", () => {
    enqueue("decks", "x");
    enqueue("matches", "x");
    expect(listOutbox()).toHaveLength(2);
  });

  it("drops the OLDEST when full, never the newest and never the local write", () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) enqueue("matches", `m${i}`);
    const entries = listOutbox();
    expect(entries).toHaveLength(MAX_ENTRIES);
    expect(entries.some((e) => e.id === "m0")).toBe(false);
    expect(entries.some((e) => e.id === `m${MAX_ENTRIES + 4}`)).toBe(true);
  });
});

describe("retrying", () => {
  it("backs off 1s, 2s, 4s… and caps at five minutes", () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(3)).toBe(4000);
    expect(backoffMs(20)).toBe(5 * 60 * 1000);
  });

  it("holds an entry back until its backoff has elapsed", () => {
    enqueue("decks", "d1");
    const now = Date.now();
    markFailed(listOutbox(), "network", now);
    expect(due(now)).toHaveLength(0);
    expect(due(now + 1001)).toHaveLength(1);
  });

  it("gives up visibly after eight tries instead of retrying for ever", () => {
    enqueue("decks", "d1");
    let now = Date.now();
    for (let i = 0; i < MAX_TRIES; i++) {
      markFailed(listOutbox(), "boom", now);
      now += 10 * 60 * 1000;
    }
    expect(due(now)).toHaveLength(0);
    expect(deadLettered()).toHaveLength(1);
    expect(deadLettered()[0].lastError).toBe("boom");
  });

  it("lets the UI revive a dead entry", () => {
    enqueue("decks", "d1");
    let now = Date.now();
    for (let i = 0; i < MAX_TRIES; i++) { markFailed(listOutbox(), "boom", now); now += 10 * 60 * 1000; }
    retryAll(now);
    expect(deadLettered()).toHaveLength(0);
    expect(due(now)).toHaveLength(1);
  });

  it("a failure of one entity leaves the others queued and due", () => {
    enqueue("decks", "d1");
    enqueue("matches", "m1");
    const now = Date.now();
    markFailed(listOutbox().filter((e) => e.entity === "decks"), "bad deck", now);
    const stillDue = due(now).map((e) => e.entity);
    expect(stillDue).toEqual(["matches"]);
  });

  it("removes what was sent and nothing else", () => {
    enqueue("decks", "d1");
    enqueue("matches", "m1");
    markSent(listOutbox().filter((e) => e.entity === "decks"));
    expect(listOutbox().map((e) => e.entity)).toEqual(["matches"]);
  });
});
