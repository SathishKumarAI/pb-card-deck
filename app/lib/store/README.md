# `lib/store` — the local store

Everything that touches `localStorage`. Components never import from this
directory: they import `lib/client-api.ts`, which is a façade re-exporting these
names. That indirection is deliberate — it is where the optional Supabase sync
queue hooks in (phase 2a, stage 4) without a single screen changing.

## Change → file

| Change | File |
|---|---|
| A storage key, or the read / write / remove guards | `keys.ts` |
| Custom decks: list, save, delete | `decks.ts` |
| Deck **share codes**, or deck → playable cards | `decks.ts` |
| Match history, or what a saved match holds | `matches.ts` |
| The **match sheet** text, the CSV columns, lifetime per-name records | `matches.ts` |
| Events (tournaments): list, get, save, delete | `tournaments.ts` |
| Starred cards, achievement counters | `prefs.ts` |
| The **backup** file's shape, or the **erase** path | `prefs.ts` |
| What components can call | `../client-api.ts` (façade only — no logic) |

## Rules worth keeping

- **A key is never spelled twice.** Every `localStorage` key is a constant in
  `keys.ts`. The erase path enumerates those constants, so a new entity cannot be
  quietly left behind by a "delete all my data" button.
- **`read` and `write` swallow their errors on purpose.** A private-mode browser
  with storage blocked, or a full quota, must not take the app down mid-match —
  a failed read falls back and a failed write is a no-op.
- **Only `prefs.ts` reads more than one entity**, because a backup and an erase
  are by definition about all of them. Everything else stays in its lane, and
  imports point one way: `prefs` → `decks` / `matches` / `tournaments` → `keys`.
- **No entity file imports the façade.** That would be a cycle; the façade exists
  for consumers, not for siblings.
- **Ids are local-only today.** `uid()` is time-plus-random, not a UUID. Phase 2a
  keeps these as the `client_id` column and gives cloud rows real UUIDs, rather
  than rewriting history in place.
