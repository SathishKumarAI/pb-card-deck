"use client";

/**
 * The sheets reachable from the app menu. One object instead of eight
 * booleans, because both the home screen and the game screen render the same
 * stack and used to each carry their own copy of the state.
 */

import { useCallback, useMemo, useState } from "react";

export type PanelName =
  | "history" | "decks" | "favorites" | "feedback" | "rules" | "browser" | "achievements";

export type PanelFlags = Record<PanelName, boolean>;

const CLOSED: PanelFlags = {
  history: false, decks: false, favorites: false,
  feedback: false, rules: false, browser: false, achievements: false,
};

export function usePanels() {
  const [open, setOpen] = useState<PanelFlags>(CLOSED);
  const show = useCallback((n: PanelName) => setOpen((o) => ({ ...o, [n]: true })), []);
  const close = useCallback((n: PanelName) => setOpen((o) => ({ ...o, [n]: false })), []);
  const closeAll = useCallback(() => setOpen(CLOSED), []);
  return useMemo(() => ({ open, show, close, closeAll }), [open, show, close, closeAll]);
}
