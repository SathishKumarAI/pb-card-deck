/**
 * The outbox: every local write that has not reached the cloud yet.
 *
 * This file owns the queue and its rules. It knows nothing about HTTP, tables or
 * Supabase - `engine.ts` drains it, `rows.ts` shapes what goes in it.
 *
 * The reason it exists at all: **a tap must never wait on the network.** Scoring
 * writes `localStorage` and appends here, and that is the whole hot path. A phone
 * on a court with no bars behaves exactly like a phone with five bars.
 *
 * Four rules, each of which is a decision:
 *
 * 1. **Coalesce by (entity, id).** Editing one deck eight times leaves one entry,
 *    the latest. Without this, a long offline session queues thousands of writes
 *    of the same few rows and the reconnect is a stampede.
 * 2. **Cap the queue at 2,000 entries** and drop the OLDEST when full. Coalescing
 *    means that is thousands of distinct rows, not thousands of edits; and if it
 *    ever does overflow, losing the oldest unsent change is better than refusing
 *    the newest or breaking the local write.
 * 3. **Back off exponentially, and give up visibly.** 1s, 2s, 4s … capped at five
 *    minutes, dead-lettered after 8 tries. A queue that retries for ever while the
 *    UI says "syncing" is a lie.
 * 4. **Nothing is queued unless syncing is switched on.** An anonymous player must
 *    not accumulate an outbox for a cloud they never asked for.
 */

import { read, write, remove } from "../store/keys";

export const OUTBOX_KEY = "pb-sync-outbox";
export const MAX_ENTRIES = 2000;
export const MAX_TRIES = 8;

/** The entities phase 2a syncs. Events arrive in their own stage. */
export type Entity = "decks" | "matches" | "prefs";

export interface OutboxEntry {
  /**
   * A monotonic number per entry, and the identity used for bookkeeping. NOT the
   * timestamp: see `stamp` below for why a millisecond is not unique enough.
   */
  seq: number;
  /** The LOCAL id (a match id, a deck id, or "me" for the single prefs row). */
  id: string;
  entity: Entity;
  op: "upsert" | "delete";
  /** When the local write happened, for ordering only. The server owns `updated_at`. */
  at: number;
  tries: number;
  /** Set once a push fails, so the UI can say which thing is stuck. */
  lastError?: string;
}

/**
 * Whether writes should be queued at all. The engine turns this on when a session
 * appears and off when it goes. Kept here rather than read from `lib/auth` so that
 * `lib/store/*` never depends on auth.
 */
let enabled = false;

export function setSyncEnabled(on: boolean) {
  enabled = on;
}
export function isSyncEnabled(): boolean {
  return enabled;
}

export function listOutbox(): OutboxEntry[] {
  return read<OutboxEntry[]>(OUTBOX_KEY, []);
}

function save(entries: OutboxEntry[]) {
  write(OUTBOX_KEY, entries);
}

/**
 * Queue one local change. Safe to call on every write: it returns immediately when
 * syncing is off, and it never throws - a storage failure here must not break the
 * local write that just succeeded.
 */
export function enqueue(entity: Entity, id: string, op: OutboxEntry["op"] = "upsert") {
  if (!enabled) return;
  try {
    const existing = listOutbox();
    const seq = existing.reduce((max, e) => Math.max(max, e.seq ?? 0), 0) + 1;
    const entries = existing.filter((e) => !(e.entity === entity && e.id === id));
    entries.push({ seq, id, entity, op, at: Date.now(), tries: 0 });
    // Oldest first, so dropping from the front drops the oldest.
    save(entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries);
  } catch {
    /* the local write already succeeded; the next push will pick this row up
       through a full comparison rather than lose it silently */
  }
}

/** Entries to attempt now: not dead, and past their backoff. */
export function due(now: number): OutboxEntry[] {
  return listOutbox().filter((e) => e.tries < MAX_TRIES && now - e.at >= backoffMs(e.tries));
}

/** Entries that have given up. These are what the UI reports as an error. */
export function deadLettered(): OutboxEntry[] {
  return listOutbox().filter((e) => e.tries >= MAX_TRIES);
}

/**
 * 0 tries → immediately, then 1s, 2s, 4s … capped at 5 minutes. Capped because an
 * unbounded doubling reaches hours and looks identical to "broken" from the court.
 */
export function backoffMs(tries: number): number {
  if (tries <= 0) return 0;
  return Math.min(1000 * 2 ** (tries - 1), 5 * 60 * 1000);
}

/**
 * Bookkeeping identity is `seq`, not (entity, id) and not the timestamp.
 *
 * A write can land while its own row is being pushed - someone renames a deck in the
 * moment between the request going out and the response coming back. Matching on
 * (entity, id) removed that brand-new entry as "sent", and the rename then never
 * reached the cloud until some unrelated later edit happened to re-queue the row.
 *
 * Matching on `at` instead is not enough either: the replacement is usually queued in
 * the SAME millisecond, so the stamps collide and the bug survives. It did, until a
 * counter replaced the clock here. (`engine.test.ts`: "a write that lands mid-sync…")
 */
const stamp = (e: OutboxEntry) => `${e.entity}:${e.id}:${e.seq}`;

export function markSent(sent: OutboxEntry[]) {
  const gone = new Set(sent.map(stamp));
  save(listOutbox().filter((e) => !gone.has(stamp(e))));
}

export function markFailed(failed: OutboxEntry[], error: string, now = Date.now()) {
  const keys = new Set(failed.map(stamp));
  save(
    listOutbox().map((e) =>
      keys.has(stamp(e)) ? { ...e, tries: e.tries + 1, at: now, lastError: error } : e,
    ),
  );
}

/** Give a dead-lettered entry one more chance, from the UI. */
export function retryAll(now = Date.now()) {
  save(listOutbox().map((e) => ({ ...e, tries: 0, at: now, lastError: undefined })));
}

export function pendingCount(): number {
  return listOutbox().length;
}

/** Sign-out: the queue belongs to the session that made it. */
export function clearOutbox() {
  remove(OUTBOX_KEY);
}
