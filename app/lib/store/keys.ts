/**
 * Every `localStorage` key this app writes, and the three helpers that guard
 * reads and writes. This file owns WHERE data lives. It owns no data shape and
 * no policy - a module that needs a key imports it from here rather than
 * spelling a string, so one edit renames a key everywhere and `clearAllData`
 * can never miss one.
 */

export const DECKS_KEY = "pb-custom-decks";
export const MATCHES_KEY = "pb-match-history";
export const FAVORITES_KEY = "pb-favorites";
export const STATS_KEY = "pb-stats";
export const EVENTS_KEY = "pb-tournaments";
export const FEEDBACK_KEY = "pb-feedback";
export const ACTIVE_GAME_KEY = "pickleball-shuffle-game";
export const SAVED_GAMES_KEY = "pickleball-shuffle-games";
export const INTRO_SEEN_KEY = "pb-beginner-intro-seen";

export const THEME_KEY = "pb-theme";
export const LAST_DECK_KEY = "pb-last-deck";
export const SAVE_HISTORY_KEY = "pb-save-history";
export const TOUR_SEEN_KEY = "pb-welcome-tour-seen";

/**
 * Every key holding something the user made, played or wrote. The erase path
 * enumerates THIS, so adding an entity to the app cannot quietly leave it behind
 * when someone presses "delete all my data" - which is exactly what happened to
 * events, saved games and the feedback copy before this list existed.
 */
export const USER_DATA_KEYS = [
  DECKS_KEY,
  MATCHES_KEY,
  FAVORITES_KEY,
  STATS_KEY,
  EVENTS_KEY,
  FEEDBACK_KEY,
  ACTIVE_GAME_KEY,
  SAVED_GAMES_KEY,
  INTRO_SEEN_KEY,
] as const;

/**
 * Settings, not data. Deliberately survive an erase: wiping your matches should
 * not put you back in light mode and replay the welcome tour.
 */
export const PREFERENCE_KEYS = [THEME_KEY, LAST_DECK_KEY, SAVE_HISTORY_KEY, TOUR_SEEN_KEY] as const;

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
