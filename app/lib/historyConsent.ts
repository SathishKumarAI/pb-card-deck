"use client";

/**
 * Whether a finished match may be written to this device's history.
 *
 * Matches used to be saved the instant a game ended, with no one asked. The
 * data never leaves the phone, but "stays on your phone" is still a promise
 * about the phone - so the first save asks, and the answer can be remembered.
 *
 * Owns the preference only. The writing itself is `addMatch` in client-api.
 */

export type SavePref = "ask" | "always" | "never";

const KEY = "pb-save-history";

export const SAVE_PREF_LABEL: Record<SavePref, string> = {
  ask: "Ask me each time",
  always: "Save automatically",
  never: "Never save",
};

export function getSavePref(): SavePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "always" || v === "never" || v === "ask") return v;
  } catch {}
  return "ask";
}

export function setSavePref(p: SavePref) {
  try { localStorage.setItem(KEY, p); } catch {}
}

/** How many finished matches the device keeps. Mirrors the cap in client-api. */
export const HISTORY_CAP = 200;

/**
 * Whether to raise the dialog for a finished game, and what to do if not.
 *
 * `answeredThisMatch` is the answer already given for THIS match, if any. A
 * best-of-3 finishes three games, and asking three times for one match is
 * what this exists to stop: the first answer carries the rest of the match.
 * A remembered preference outranks both.
 */
export function shouldAskToSave(
  pref: SavePref,
  answeredThisMatch: boolean | undefined,
): { ask: boolean; save: boolean } {
  if (pref === "always") return { ask: false, save: true };
  if (pref === "never") return { ask: false, save: false };
  if (answeredThisMatch !== undefined) return { ask: false, save: answeredThisMatch };
  return { ask: true, save: false };
}
