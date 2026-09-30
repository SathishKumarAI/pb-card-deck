/**
 * Local id ⇄ cloud UUID.
 *
 * Local ids are time-plus-random strings that predate any cloud
 * (`mfj3k-ab12cd`); the tables want UUID primary keys. This file mints a UUID the
 * first time a local row is pushed and remembers it, so the tenth edit of a deck
 * updates the same cloud row rather than inserting a tenth copy.
 *
 * It owns the mapping and nothing else. The map is per device and disposable: if it
 * is lost, `client_id` (unique per user) still identifies the row, and the next
 * push re-learns the UUID from what comes back in a pull.
 */

import { read, write, remove } from "../store/keys";

export const IDMAP_KEY = "pb-sync-idmap";

type Map_ = Record<string, string>;

function all(): Map_ {
  return read<Map_>(IDMAP_KEY, {});
}

function keyFor(entity: string, localId: string) {
  return `${entity}:${localId}`;
}

function newUuid(): string {
  // `randomUUID` needs a secure context; older iOS in an http LAN dev session does
  // not have it, and a sync id is not a secret - so a v4-shaped fallback is fine.
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const hex = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** The cloud UUID for a local row, minting and remembering one if needed. */
export function cloudIdFor(entity: string, localId: string): string {
  const map = all();
  const k = keyFor(entity, localId);
  if (map[k]) return map[k];
  const id = newUuid();
  map[k] = id;
  write(IDMAP_KEY, map);
  return id;
}

/** Learn a pairing from a row that came back from the server. */
export function rememberCloudId(entity: string, localId: string, cloudId: string) {
  if (!localId || !cloudId) return;
  const map = all();
  const k = keyFor(entity, localId);
  if (map[k] === cloudId) return;
  map[k] = cloudId;
  write(IDMAP_KEY, map);
}

export function clearIdMap() {
  remove(IDMAP_KEY);
}
