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
| One event ⇄ header row + match rows + log lines | `eventRows.ts` |
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
- **The pull's protected set is the WHOLE outbox, not `due(now)`.** `now` is captured
  before the push, so an entry re-queued *during* the push is stamped later and
  `due(now)` excluded it whenever the clock ticked - and the pull then undid that edit.
  It showed up as a 1-in-3 flaky test and was a silently lost write in production.
  Backoff decides when to push; it says nothing about whether this device has an unsent
  change for a row.
- **Never move a cursor backwards**, or a late page re-pulls for ever.
- **The status must never lie.** `synced` means the queue is empty. Anything queued
  says so, a dead-lettered entry says what is stuck, and the error text always ends
  with the true part: the data is still safe on the device.
- **Signing out clears the queue, the cursors and the id map — and keeps the data.**
  Emptying someone's device because they signed out of an account would be the worst
  possible reading of "sign out". "Delete all data" in the menu is the explicit wipe.

## Events, and why they are the odd one out

Locally an event is **one JSON blob** — teams, every match, the whole change log —
written whole on every change. In the database it is a **header row, one row per
match, and an append-only log**. `eventRows.ts` is where that asymmetry is paid for.

The blob is right locally (one write, no joins, the tournament engine stays free of
storage) and wrong in the cloud, because phase 2c needs two people entering results
for different matches of one event without overwriting each other. A blob column
would make a club night a last-write-wins race over the entire day.

Consequences to keep in mind:

- **The queue holds one entry per EVENT**, not per match, mirroring how the blob is
  saved. The push fans out; the pull reassembles.
- **The log is append-only in the database**, so re-sending is refused, not merely
  wasteful. `logSentCount` tracks how many lines have gone, only ever moves forwards,
  and is also set when lines arrive from another device — otherwise this device would
  try to append what it just received.
- **Matches and log lines are pulled by parent, not by timestamp.** A match that has
  not changed is still part of the event being rebuilt.
- **Only the header is tombstoned on delete**; the children cascade.
- **Absent must stay absent.** A match with no score is "not played yet", and
  reassembling it as `0-0` would put a phantom result on a bracket.

## Not here yet

No realtime subscription — it is one person's own data, and a websocket held open on a
court costs battery for nothing. Phase 2b's shared read link is where that question
comes back.
