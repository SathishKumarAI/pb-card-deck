/**
 * Custom decks: the list a player builds, the share code that moves one between
 * devices, and the mapping from a saved deck to playable cards.
 *
 * This file owns the deck shape and deck storage. It does not own the built-in
 * 1,729-card deck (`lib/cards.ts`) and knows nothing about matches or events.
 */

import { Card, CATEGORIES } from "../cards";
import { DECKS_KEY, read, write, uid } from "./keys";
import { enqueue } from "../sync/outbox";

export interface CustomDeck {
  id: string;
  name: string;
  description: string;
  cards: { name: string; effect: string; category: string }[];
  created_at: number;
}

export function listDecks(): CustomDeck[] {
  return read<CustomDeck[]>(DECKS_KEY, []).sort((a, b) => b.created_at - a.created_at);
}

export function saveDeck(deck: { name: string; description: string; cards: CustomDeck["cards"] }): CustomDeck {
  const decks = read<CustomDeck[]>(DECKS_KEY, []);
  const created: CustomDeck = { id: uid(), created_at: Date.now(), ...deck };
  write(DECKS_KEY, [created, ...decks]);
  enqueue("decks", created.id);
  return created;
}

export function deleteDeck(id: string) {
  write(DECKS_KEY, read<CustomDeck[]>(DECKS_KEY, []).filter((d) => d.id !== id));
  enqueue("decks", id, "delete");
}

/* ─── applied BY the sync engine, never by the UI ───
   These write the local copy of something the server already has, so they must not
   enqueue: queueing here would push the row straight back and loop for ever. */

export function applyRemoteDeck(deck: CustomDeck) {
  const rest = read<CustomDeck[]>(DECKS_KEY, []).filter((d) => d.id !== deck.id);
  write(DECKS_KEY, [deck, ...rest]);
}

export function dropDeckLocally(id: string) {
  write(DECKS_KEY, read<CustomDeck[]>(DECKS_KEY, []).filter((d) => d.id !== id));
}

/* ─── Share codes (backlog F042 / F043) ─── */

// Encode a deck to a compact URL-safe base64 code, importable on another device.
export function encodeDeck(d: { name: string; description: string; cards: CustomDeck["cards"] }): string {
  const payload = { n: d.name, d: d.description, c: d.cards.map((c) => ({ n: c.name, e: c.effect, k: c.category })) };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDeck(code: string): { name: string; description: string; cards: CustomDeck["cards"] } | null {
  try {
    const b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(json);
    if (!p || !Array.isArray(p.c)) return null;
    const cats = new Set<string>(CATEGORIES);
    const cards = p.c
      .filter((x: { n?: string; e?: string }) => x && x.n && x.e)
      .map((x: { n: string; e: string; k?: string }) => ({
        name: String(x.n).slice(0, 80),
        effect: String(x.e).slice(0, 300),
        category: cats.has(String(x.k)) ? String(x.k) : CATEGORIES[0],
      }));
    if (cards.length === 0) return null;
    return {
      name: String(p.n || "Imported deck").slice(0, 60),
      description: String(p.d || "").slice(0, 120),
      cards,
    };
  } catch {
    return null;
  }
}

// Decode + save a shared deck. Returns the saved deck, or null if the code is bad.
export function importDeckCode(code: string): CustomDeck | null {
  const d = decodeDeck(code);
  if (!d) return null;
  return saveDeck(d);
}

/* Turn a custom deck's cards into playable Card objects (negative ids avoid
   clashing with the built-in 1-1729 id space). */
export function deckToCards(deck: CustomDeck): Card[] {
  return deck.cards.map((c, i) => ({
    id: -(i + 1),
    category: c.category || "Wacky / Chaos",
    name: c.name,
    effect: c.effect,
    vibe: "",
  }));
}
