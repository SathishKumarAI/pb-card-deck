/**
 * Which events on this device belong to somebody else.
 *
 * Phase 2c: a helper accepts an invite and the event appears in their app. It is not
 * theirs, and three things depend on knowing that:
 *
 * 1. **The push must skip the event header.** A writer's header upsert is refused by
 *    policy, and retrying it would dead-letter the whole event - so the engine sends
 *    matches and log lines only.
 * 2. **The screens must hide what a writer cannot do.** Rename, re-draw, delete and the
 *    invite controls are absent rather than present-and-failing.
 * 3. **Nothing else changes.** Scoring, standings and the bracket are identical; a
 *    helper is running the same event, not a lesser copy of it.
 *
 * Learned from the pull: the header row carries the owner's `user_id`, so the engine
 * records the answer here rather than guessing later. Stored per device and cleared on
 * sign-out with the rest of the sync bookkeeping.
 */

import { read, write, remove } from "../store/keys";

export const SHARED_EVENTS_KEY = "pb-sync-shared-events";

/** local event id -> the owner's account id */
type OwnerMap = Record<string, string>;

export function markSharedEvent(localEventId: string, ownerUserId: string) {
  const all = read<OwnerMap>(SHARED_EVENTS_KEY, {});
  if (all[localEventId] === ownerUserId) return;
  write(SHARED_EVENTS_KEY, { ...all, [localEventId]: ownerUserId });
}

/** An event that turns out to be ours after all (ownership transfer, or a re-pull). */
export function markOwnEvent(localEventId: string) {
  const all = read<OwnerMap>(SHARED_EVENTS_KEY, {});
  if (!(localEventId in all)) return;
  delete all[localEventId];
  write(SHARED_EVENTS_KEY, all);
}

export function isSharedEvent(localEventId: string): boolean {
  return Boolean(read<OwnerMap>(SHARED_EVENTS_KEY, {})[localEventId]);
}

export function sharedEventOwner(localEventId: string): string | null {
  return read<OwnerMap>(SHARED_EVENTS_KEY, {})[localEventId] ?? null;
}

export function listSharedEventIds(): string[] {
  return Object.keys(read<OwnerMap>(SHARED_EVENTS_KEY, {}));
}

/** Sign-out: this map belongs to that session. */
export function clearSharedEvents() {
  remove(SHARED_EVENTS_KEY);
}
