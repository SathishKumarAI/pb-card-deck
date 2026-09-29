/**
 * The local store's front door. Every component reads and writes the device
 * through this module and nothing else, which is what keeps storage swappable:
 * when phase 2 adds an optional Supabase account, the sync queue hooks in
 * behind this façade and no screen changes.
 *
 * It owns no logic. Each concern lives in its own file:
 *
 * | Change | File |
 * |---|---|
 * | A localStorage key, or the read/write guards | `store/keys.ts` |
 * | Custom decks, share codes, deck → cards | `store/decks.ts` |
 * | Match history, match sheet, CSV, records | `store/matches.ts` |
 * | Events (tournaments) | `store/tournaments.ts` |
 * | Favorites, stats, backup, erase | `store/prefs.ts` |
 */

export type { CustomDeck } from "./store/decks";
export type { SavedMatch } from "./store/matches";

export { listDecks, saveDeck, deleteDeck, encodeDeck, decodeDeck, importDeckCode, deckToCards } from "./store/decks";

export { listMatches, addMatch, matchSheet, clearMatches, playerRecords, matchesToCsv } from "./store/matches";

export { listTournaments, getTournament, saveTournament, deleteTournament } from "./store/tournaments";

export { listFavoriteIds, toggleFavorite, getStats, bumpStat, exportData, importData, clearAllData } from "./store/prefs";
