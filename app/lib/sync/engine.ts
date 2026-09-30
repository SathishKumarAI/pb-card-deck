/**
 * The sync engine: drain the outbox, pull what changed, and never block play.
 *
 * It owns WHEN data moves and WHO WINS a conflict. It does not own HTTP - that is
 * `Transport`, a four-method interface with a Supabase implementation at the bottom
 * of this file and a fake one in `engine.test.ts`. Shapes are `rows.ts`; the queue
 * is `outbox.ts`.
 *
 * **Conflict rule, stated once and applied everywhere: a local row with a pending
 * outbox entry wins; otherwise the server row wins.** No per-row local clock is
 * kept, and that is deliberate - a device's clock cannot be trusted, and the only
 * question that actually matters is "did this device change this row and not send
 * it yet?". The outbox already answers it exactly.
 *
 * Prefs are the one exception and merge instead: two phones each starring a
 * different card must end with both stars, and a counter must not go backwards
 * because the other phone was behind (`mergePrefs`).
 */

import { listDecks, applyRemoteDeck, dropDeckLocally } from "../store/decks";
import { listMatches, applyRemoteMatch, dropMatchLocally } from "../store/matches";
import { listFavoriteIds, getStats, applyRemotePrefs } from "../store/prefs";
import { listTournaments, applyRemoteTournament, dropTournamentLocally } from "../store/tournaments";
import { read, write, remove } from "../store/keys";
import {
  type Entity,
  type OutboxEntry,
  due,
  listOutbox,
  markSent,
  markFailed,
  deadLettered,
  pendingCount,
  clearOutbox,
  setSyncEnabled,
} from "./outbox";
import { clearIdMap, rememberCloudId } from "./idmap";
import { markSharedEvent, markOwnEvent, isSharedEvent, clearSharedEvents } from "./sharedEvents";
import {
  deckToRow, rowToDeck, matchToRow, rowToMatch,
  prefsToRow, rowToPrefs, mergePrefs,
  type DeckRow, type MatchRow, type PrefsRow,
} from "./rows";
import {
  eventToHeaderRow, eventToMatchRows, unsentLogRows, setLogSentCount,
  rowsToTournament, type EventRow, type EventMatchRow, type EventLogRow,
} from "./eventRows";

export const CURSOR_KEY = "pb-sync-cursors";
const TABLE: Record<Entity, string> = {
  decks: "decks", matches: "matches", prefs: "prefs", tournaments: "tournaments",
} as unknown as Record<Entity, string>;
/* `events` is the queue's name for a whole event; these are the three tables one
   event fans out into. */
const EVENT_TABLES = { header: "tournaments", matches: "tournament_matches", log: "event_log" };

/* ─────────────────────────── transport ─────────────────────────── */

export interface Transport {
  upsert(table: string, rows: Record<string, unknown>[], onConflict?: string): Promise<void>;
  /** Soft delete: the tombstone is what reaches the other device. */
  softDelete(table: string, ids: string[]): Promise<void>;
  /** Rows changed after `cursor`, oldest first. */
  pull(table: string, cursor: string | null, limit: number): Promise<Record<string, unknown>[]>;
  /**
   * Every row of `table` whose `column` equals `value`. Needed because an event's
   * matches and log lines are fetched by parent, not by timestamp - a match that
   * has not changed since the last sync is still part of the event being rebuilt.
   */
  pullChildren(table: string, column: string, value: string, orderBy: string): Promise<Record<string, unknown>[]>;
}

/* ──────────────────────── observable status ────────────────────── */

export type SyncPhase = "off" | "idle" | "syncing" | "offline" | "error";
export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  /** Set when entries have given up, naming what is stuck. */
  error: string | null;
  lastSyncedAt: number | null;
}

/**
 * The signed-in account, set by `startSyncing`. The engine needs it for exactly one
 * question - is this event mine? - and asking `lib/auth` for it here would make the
 * data layer depend on the auth layer for a string.
 */
let sessionUserId: string | null = null;

let status: SyncStatus = { phase: "off", pending: 0, error: null, lastSyncedAt: null };
const listeners = new Set<() => void>();

function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next, pending: next.pending ?? pendingCount() };
  listeners.forEach((l) => l());
}

export function getSyncStatus(): SyncStatus {
  return status;
}
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ───────────────────────────── cursors ─────────────────────────── */

type Cursors = Partial<Record<Entity, string>>;

export function getCursor(entity: Entity): string | null {
  return read<Cursors>(CURSOR_KEY, {})[entity] ?? null;
}
function setCursor(entity: Entity, value: string) {
  const all = read<Cursors>(CURSOR_KEY, {});
  // Never move a cursor backwards: a late page must not cause a re-pull loop.
  if (all[entity] && all[entity]! >= value) return;
  write(CURSOR_KEY, { ...all, [entity]: value });
}

/* ────────────────────────────── push ───────────────────────────── */

async function pushEntity(t: Transport, entity: Entity, entries: OutboxEntry[]): Promise<void> {
  const deletes = entries.filter((e) => e.op === "delete");
  const upserts = entries.filter((e) => e.op === "upsert");

  if (upserts.length) {
    if (entity === "decks") {
      const byId = new Map(listDecks().map((d) => [d.id, d]));
      const rows = upserts.map((e) => byId.get(e.id)).filter(Boolean).map((d) => deckToRow(d!));
      if (rows.length) await t.upsert(TABLE.decks, rows as unknown as Record<string, unknown>[]);
    } else if (entity === "matches") {
      const byId = new Map(listMatches().map((m) => [m.id, m]));
      const rows = upserts.map((e) => byId.get(e.id)).filter(Boolean).map((m) => matchToRow(m!));
      if (rows.length) await t.upsert(TABLE.matches, rows as unknown as Record<string, unknown>[]);
    } else if (entity === "events") {
      // One event fans out into three tables, header first so the children have a
      // parent to point at.
      const byId = new Map(listTournaments().map((e) => [e.id, e]));
      for (const e of upserts) {
        const event = byId.get(e.id);
        if (!event) continue;
        /* An event shared with this account (phase 2c): the header is the owner's and a
           writer's upsert of it is refused by policy. Sending it anyway would fail the
           whole entity every time and eventually dead-letter the event, so the header is
           skipped and only the work a helper is allowed to do travels. */
        if (!isSharedEvent(event.id)) {
          await t.upsert(EVENT_TABLES.header, [eventToHeaderRow(event) as unknown as Record<string, unknown>]);
        }
        const matchRows = eventToMatchRows(event);
        if (matchRows.length) await t.upsert(EVENT_TABLES.matches, matchRows as unknown as Record<string, unknown>[]);
        // Append-only: only the lines this device has not sent, and only once.
        const logRows = unsentLogRows(event);
        if (logRows.length) {
          await t.upsert(EVENT_TABLES.log, logRows as unknown as Record<string, unknown>[]);
          setLogSentCount(event.id, (event.log ?? []).length);
        }
      }
    } else {
      const row = prefsToRow({ favorites: listFavoriteIds(), stats: getStats() });
      // One row per user, so the conflict target is the owner column.
      await t.upsert(TABLE.prefs, [row as unknown as Record<string, unknown>], "user_id");
    }
  }

  if (deletes.length && entity === "events") {
    const { cloudIdFor } = await import("./idmap");
    // Only the header is tombstoned: the children cascade from it, and a delete of
    // an event nobody else can see needs no more than that.
    await t.softDelete(EVENT_TABLES.header, deletes.map((e) => cloudIdFor("tournaments", e.id)));
  } else if (deletes.length && entity !== "prefs") {
    // Deleting a row whose local copy is already gone still needs its cloud id,
    // which the id map remembers from when it was first pushed.
    const { cloudIdFor } = await import("./idmap");
    await t.softDelete(TABLE[entity], deletes.map((e) => cloudIdFor(entity, e.id)));
  }
}

/* ────────────────────────────── pull ───────────────────────────── */

const PAGE = 500;

async function pullEvents(t: Transport, pendingIds: Set<string>): Promise<void> {
  const headers = (await t.pull(EVENT_TABLES.header, getCursor("events"), PAGE)) as unknown as (EventRow & { updated_at?: string })[];
  for (const header of headers) {
    const localId = header.client_id || header.id;
    rememberCloudId("tournaments", localId, header.id);
    /* The header carries its owner, so ownership is LEARNED here rather than guessed
       later. `sessionUserId` is null only when a pull somehow runs without a session,
       in which case treating the event as ours is the conservative answer - it keeps
       the old single-user behaviour. */
    const ownerId = (header as unknown as { user_id?: string }).user_id;
    if (ownerId && sessionUserId && ownerId !== sessionUserId) markSharedEvent(localId, ownerId);
    else markOwnEvent(localId);
    if (!pendingIds.has(localId)) {
      if (header.deleted_at) {
        dropTournamentLocally(localId);
      } else {
        // Matches and log lines come by parent, not by timestamp: an unchanged match
        // is still part of the event being rebuilt.
        const matchRows = (await t.pullChildren(EVENT_TABLES.matches, "tournament_id", header.id, "round")) as unknown as EventMatchRow[];
        const logRows = (await t.pullChildren(EVENT_TABLES.log, "tournament_id", header.id, "at")) as unknown as EventLogRow[];
        const event = rowsToTournament(header, matchRows.filter((m) => !m.deleted_at), logRows);
        applyRemoteTournament(event);
        // Lines that arrived from elsewhere are already in the cloud, so this device
        // must not try to append them again.
        setLogSentCount(localId, (event.log ?? []).length);
      }
    }
    if (header.updated_at) setCursor("events", header.updated_at);
  }
}

async function pullEntity(t: Transport, entity: Entity, pendingIds: Set<string>): Promise<void> {
  if (entity === "events") return pullEvents(t, pendingIds);
  const rows = await t.pull(TABLE[entity], getCursor(entity), PAGE);
  if (!rows.length) return;

  for (const raw of rows) {
    const updatedAt = String(raw.updated_at ?? "");
    if (entity === "prefs") {
      const remote = rowToPrefs(raw as unknown as PrefsRow);
      const merged = mergePrefs({ favorites: listFavoriteIds(), stats: getStats() }, remote);
      applyRemotePrefs(merged);
    } else if (entity === "decks") {
      const row = raw as unknown as DeckRow;
      const localId = row.client_id || row.id;
      rememberCloudId("decks", localId, row.id);
      if (pendingIds.has(localId)) continue; // this device has an unsent edit; it wins
      if (row.deleted_at) dropDeckLocally(localId);
      else applyRemoteDeck(rowToDeck(row));
    } else {
      const row = raw as unknown as MatchRow;
      const localId = row.client_id || row.id;
      rememberCloudId("matches", localId, row.id);
      if (pendingIds.has(localId)) continue;
      if (row.deleted_at) dropMatchLocally(localId);
      else applyRemoteMatch(rowToMatch(row));
    }
    if (updatedAt) setCursor(entity, updatedAt);
  }
}

/* ────────────────────────── the one entry point ─────────────────── */

let running = false;

/**
 * Push, then pull. Safe to call from anywhere and as often as anything likes: it is
 * a no-op while a previous run is in flight or the device is offline.
 */
export async function syncNow(t: Transport, now = Date.now()): Promise<void> {
  if (running) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus({ phase: "offline" });
    return;
  }
  running = true;
  setStatus({ phase: "syncing", error: null });
  try {
    const entries = due(now);
    const byEntity = new Map<Entity, OutboxEntry[]>();
    for (const e of entries) byEntity.set(e.entity, [...(byEntity.get(e.entity) ?? []), e]);

    for (const [entity, group] of byEntity) {
      try {
        await pushEntity(t, entity, group);
        markSent(group);
      } catch (err) {
        // Failing one entity must not stop the others: a deck that violates a check
        // constraint should not hold every match hostage.
        markFailed(group, err instanceof Error ? err.message : String(err), now);
      }
    }

    /* Anything still queued would be clobbered by a pull, so it wins this round.
     *
     * Read the WHOLE outbox here, not `due(now)`: `now` was captured before the push,
     * and an entry queued during the push (a rename landing between request and
     * response) carries a later timestamp, so `due(now)` excluded it whenever the clock
     * happened to tick - and the pull then undid that rename. It reproduced as a 1-in-3
     * flaky test, which is the same bug at a different odds.
     *
     * Backoff decides when to PUSH an entry. It has nothing to do with whether this
     * device has an unsent change for a row, which is the only question the pull needs
     * answered. */
    const pendingByEntity = new Map<Entity, Set<string>>();
    for (const e of listOutbox()) {
      const set = pendingByEntity.get(e.entity) ?? new Set<string>();
      set.add(e.id);
      pendingByEntity.set(e.entity, set);
    }

    for (const entity of ["decks", "matches", "prefs", "events"] as Entity[]) {
      await pullEntity(t, entity, pendingByEntity.get(entity) ?? new Set());
    }

    const dead = deadLettered();
    setStatus({
      phase: dead.length ? "error" : "idle",
      error: dead.length ? describeStuck(dead) : null,
      lastSyncedAt: dead.length ? status.lastSyncedAt : now,
    });
  } catch (err) {
    setStatus({ phase: "error", error: err instanceof Error ? err.message : String(err) });
  } finally {
    running = false;
  }
}

/** Says WHAT is stuck, not just that something is. */
export function describeStuck(dead: OutboxEntry[]): string {
  const counts = new Map<Entity, number>();
  for (const e of dead) counts.set(e.entity, (counts.get(e.entity) ?? 0) + 1);
  const parts = [...counts.entries()].map(([entity, n]) => `${n} ${entity}`);
  return `Could not sync ${parts.join(", ")}. Everything is still safe on this device.`;
}

/* ───────────────────── session start and end ───────────────────── */

export function startSyncing(userId: string | null = null) {
  sessionUserId = userId;
  setSyncEnabled(true);
  setStatus({ phase: "idle" });
}

/**
 * Sign-out. The queue, the cursors and the id map belong to that session and go.
 *
 * What stays is this device's own copy of the data, deliberately: the app is
 * local-first, and silently emptying someone's history because they signed out of
 * an account would be the worst possible reading of "sign out". The account sheet
 * says so, and "Delete all data" in the menu is the explicit wipe.
 */
export function stopSyncing() {
  setSyncEnabled(false);
  sessionUserId = null;
  clearOutbox();
  clearIdMap();
  clearSharedEvents();
  remove(CURSOR_KEY);
  setStatus({ phase: "off", pending: 0, error: null, lastSyncedAt: null });
}

/* ──────────────────── the Supabase implementation ───────────────── */

/** Wraps a Supabase client in the four methods the engine needs. */
export function supabaseTransport(sb: {
  from: (table: string) => {
    upsert: (rows: unknown, opts?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
    update: (patch: unknown) => { in: (col: string, ids: string[]) => Promise<{ error: { message: string } | null }> };
    select: (cols: string) => {
      gt: (col: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }> } };
      order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }> };
    };
  };
}): Transport {
  return {
    async upsert(table, rows, onConflict) {
      const { error } = await sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
      if (error) throw new Error(error.message);
    },
    async softDelete(table, ids) {
      if (!ids.length) return;
      const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).in("id", ids);
      if (error) throw new Error(error.message);
    },
    async pullChildren(table, column, value, orderBy) {
      const { data, error } = await (sb.from(table).select("*") as unknown as {
        eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> };
      }).eq(column, value).order(orderBy, { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Record<string, unknown>[]) ?? [];
    },
    async pull(table, cursor, limit) {
      const base = sb.from(table).select("*");
      const q = cursor
        ? base.gt("updated_at", cursor).order("updated_at", { ascending: true }).limit(limit)
        : base.order("updated_at", { ascending: true }).limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as Record<string, unknown>[]) ?? [];
    },
  };
}
