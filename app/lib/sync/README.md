# `lib/sync` — the optional cloud sync

Runs only when someone is signed in. With no account, or no Supabase project
configured, every function here is inert and `lib/store/*` behaves exactly as it
did before this directory existed.

The one idea: **a tap never waits on the network.** A local write goes to
`localStorage` and appends to a queue, and that is the whole hot path. Everything
else happens in the background, and the UI always says which.

## Change → file

| Change | File |
|---|---|
| What a local write queues, coalescing, the cap, backoff, dead-lettering | `outbox.ts` |
| A field's shape on the wire, in either direction | `rows.ts` |
| How favourites and counters merge | `rows.ts` (`mergePrefs`) |
| When a push or pull happens, who wins a conflict, the status | `engine.ts` |
| Talking to Supabase specifically | `engine.ts` (`supabaseTransport`) |
| What triggers a sync, and following the session | `runtime.ts` |
| Local id ⇄ cloud UUID | `idmap.ts` |
| The first-sign-in "bring your data?" decision and its counts | `claim.ts` |
| The chip a user reads | `../../components/SyncStatus.tsx` |

## Rules that must survive every future change

- **`enqueue` is called by `lib/store/*`, never by a component.** The store is the
  only thing that knows a write happened, and the façade (`lib/client-api.ts`)
  keeps components unaware that sync exists at all.
- **`applyRemote*` functions must never enqueue.** They write a copy of something
  the server already has; queueing there pushes it straight back, for ever.
- **The conflict rule is the queue, not a clock.** A row with a pending outbox entry
  wins; otherwise the server wins. No local per-row timestamp is kept, because a
  device's clock cannot be trusted and the only question that matters is "did this
  device change this row and not send it yet?".
- **Prefs merge, they do not overwrite.** Two phones each starring a different card
  must end with both stars, and a counter must never go backwards. Last-write-wins
  is right for a match record and wrong for a set.
- **Outbox bookkeeping is keyed on `seq`.** Not on (entity, id), and not on the
  timestamp. A write can land while its own row is being pushed, and both of the
  other keys dropped that write silently — the timestamp version collided because
  the replacement is usually queued in the same millisecond. See
  `engine.test.ts` → "a write that lands mid-sync…".
- **Never move a cursor backwards**, or a late page re-pulls for ever.
- **The status must never lie.** `synced` means the queue is empty. Anything queued
  says so, a dead-lettered entry says what is stuck, and the error text always ends
  with the true part: the data is still safe on the device.
- **Signing out clears the queue, the cursors and the id map — and keeps the data.**
  Emptying someone's device because they signed out of an account would be the worst
  possible reading of "sign out". "Delete all data" in the menu is the explicit wipe.

## Not here yet

**Events (tournaments) do not sync.** They are the next stage: the local shape is one
JSON blob while the schema stores an event as a header row, one row per match and an
append-only log, so the mapping is bigger than everything in this directory put
together. Matches, decks, favourites and counters sync today.

No realtime subscription either — it is one person's own data, and a websocket held
open on a court costs battery for nothing. Phase 2b's shared read link is where that
question comes back.
