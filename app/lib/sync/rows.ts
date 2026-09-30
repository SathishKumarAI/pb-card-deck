/**
 * The one place a local shape becomes a database row, and back.
 *
 * Both directions live here on purpose: a field added to `SavedMatch` and not to
 * the row (or vice versa) is then a one-file mistake with a test that catches it
 * (`rows.test.ts` round-trips every entity), rather than data that quietly stops
 * travelling between devices.
 *
 * **Ids.** Local ids are time-plus-random (`mfj3k-ab12cd`), not UUIDs, and the
 * tables want UUID primary keys. So every row carries:
 *   - `id` - a UUID, minted once per local row and remembered (`idmap.ts`), so a
 *     later edit of the same local row updates the same cloud row;
 *   - `client_id` - the local id, unique per user, which is how a pull finds the
 *     local row a cloud row belongs to.
 * `user_id` and `updated_at` are NOT sent: database triggers own both, so a device
 * can neither forge ownership nor win a conflict by lying about the time.
 */

import type { CustomDeck } from "../store/decks";
import type { SavedMatch } from "../store/matches";
import { cloudIdFor } from "./idmap";

/* ─────────────────────────── decks ─────────────────────────── */

export interface DeckRow {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  cards: CustomDeck["cards"];
  created_at: string;
  deleted_at?: string | null;
}

export function deckToRow(d: CustomDeck): DeckRow {
  return {
    id: cloudIdFor("decks", d.id),
    client_id: d.id,
    // The column requires 1-80 characters; an empty name would be rejected for the
    // whole batch, so it is normalised here rather than failing the push.
    name: (d.name || "Untitled deck").slice(0, 80),
    description: (d.description || "").slice(0, 300) || null,
    cards: d.cards ?? [],
    created_at: new Date(d.created_at || Date.now()).toISOString(),
  };
}

export function rowToDeck(r: DeckRow): CustomDeck {
  return {
    id: r.client_id || r.id,
    name: r.name,
    description: r.description ?? "",
    cards: r.cards ?? [],
    created_at: new Date(r.created_at).getTime(),
  };
}

/* ────────────────────────── matches ────────────────────────── */

export interface MatchRow {
  id: string;
  client_id: string;
  mode: string;
  team1_name: string;
  team2_name: string;
  score_team1: number;
  score_team2: number;
  winner: number | null;
  game_number: number;
  duration_ms: number;
  results: { team1: number; team2: number }[];
  official: boolean;
  event_label: string | null;
  game_type: string | null;
  timeouts: { team1: number; team2: number } | null;
  faults: { team1: number; team2: number } | null;
  played_at: string;
  created_at: string;
  deleted_at?: string | null;
}

/** The column allows only these three; anything else would reject the batch. */
const GAME_TYPES = new Set(["singles", "doubles", "mixed-doubles"]);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n || 0)));

export function matchToRow(m: SavedMatch): MatchRow {
  return {
    id: cloudIdFor("matches", m.id),
    client_id: m.id,
    mode: (m.mode || "chaos").slice(0, 40),
    team1_name: (m.team1_name || "").slice(0, 80),
    team2_name: (m.team2_name || "").slice(0, 80),
    score_team1: clamp(m.score_team1, 0, 999),
    score_team2: clamp(m.score_team2, 0, 999),
    winner: m.winner === 1 || m.winner === 2 ? m.winner : null,
    game_number: clamp(m.game_number || 1, 1, 99),
    duration_ms: Math.max(0, Math.round(m.duration_ms || 0)),
    results: Array.isArray(m.results) ? m.results : [],
    official: Boolean(m.official),
    event_label: m.event_label ? m.event_label.slice(0, 120) : null,
    game_type: m.game_type && GAME_TYPES.has(m.game_type) ? m.game_type : null,
    timeouts: m.timeouts ?? null,
    faults: m.faults ?? null,
    played_at: new Date(m.created_at || Date.now()).toISOString(),
    created_at: new Date(m.created_at || Date.now()).toISOString(),
  };
}

export function rowToMatch(r: MatchRow): SavedMatch {
  const match: SavedMatch = {
    id: r.client_id || r.id,
    mode: r.mode,
    team1_name: r.team1_name,
    team2_name: r.team2_name,
    score_team1: r.score_team1,
    score_team2: r.score_team2,
    winner: r.winner,
    game_number: r.game_number,
    duration_ms: r.duration_ms,
    results: r.results ?? [],
    created_at: new Date(r.created_at || r.played_at).getTime(),
  };
  // Official extras are absent on a casual match, and absent is not the same as
  // false: `official: false` on every row would make history read as officiated.
  if (r.official) {
    match.official = true;
    if (r.event_label) match.event_label = r.event_label;
    if (r.game_type) match.game_type = r.game_type;
    if (r.timeouts) match.timeouts = r.timeouts;
    if (r.faults) match.faults = r.faults;
  }
  return match;
}

/* ─────────────────────────── prefs ─────────────────────────── */

/**
 * Favorites and the achievement counters, as one row. Not collaborative and never
 * large, so splitting it into columns would buy nothing.
 */
export interface PrefsPayload {
  favorites: number[];
  stats: Record<string, number>;
}

export interface PrefsRow {
  data: PrefsPayload;
}

export function prefsToRow(p: PrefsPayload): PrefsRow {
  return { data: { favorites: p.favorites ?? [], stats: p.stats ?? {} } };
}

export function rowToPrefs(r: PrefsRow): PrefsPayload {
  return { favorites: r.data?.favorites ?? [], stats: r.data?.stats ?? {} };
}

/**
 * Merging prefs is a union, not a replacement: two devices each starring a
 * different card must end up with both stars, and a counter must not go backwards
 * because the other phone was behind. Last-write-wins is right for a match record
 * and wrong for a set of favourites.
 */
export function mergePrefs(local: PrefsPayload, remote: PrefsPayload): PrefsPayload {
  const favorites = [...new Set([...(local.favorites ?? []), ...(remote.favorites ?? [])])];
  const stats: Record<string, number> = { ...(remote.stats ?? {}) };
  for (const [k, v] of Object.entries(local.stats ?? {})) {
    stats[k] = Math.max(v, stats[k] ?? 0);
  }
  return { favorites, stats };
}
