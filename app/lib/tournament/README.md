# `lib/tournament` — the event engine

Pure functions. No React, no DOM, no storage: you hand these a `Tournament` and
get a new one back, exactly like `lib/game.ts`. Persistence lives in
`lib/client-api.ts`; the screens live in `components/tournament/`.

## Change → file

| Change | File |
|---|---|
| Add a field to an event, a match, or a config option | `types.ts` |
| Add a **format**, or change what happens when a result lands | `engine.ts` |
| Round-robin scheduling (who plays whom, in what round) | `roundRobin.ts` |
| Bracket shape, seeding, byes, losers-bracket wiring | `elimination.ts` |
| Table order, tiebreaks, per-player scoring | `standings.ts` |
| Pool splitting, or how pools feed the playoff | `engine.ts` (`splitIntoPools`, `seedBracketFromPools`) |
| Partner-mixer round generation, sit-outs | `engine.ts` (`rotatingRound`) |
| Court assignment | `engine.ts` (`assignCourts`) |

Tests sit beside the code and are named for the failure they catch:
`roundRobin.test.ts`, `engine.test.ts`.

## The one idea

**A match holds two slots, not two teams.** A slot says where its team comes
from — a seed, the winner of another match, the loser of another match, or a
bye:

```ts
type Slot =
  | { from: "team"; teamId: string }
  | { from: "winner"; matchId: string }
  | { from: "loser"; matchId: string }
  | { from: "bye" };
```

Every format is then the same object with different wiring, and one function —
`resolveSlots` — walks the list filling in whatever is now knowable. That single
pass is what advances a bracket, awards a bye without anybody playing it, builds
the playoff once the pools finish, and decides a double-elimination reset is not
needed. Adding a format means writing its wiring, not writing new advance logic.

## Rules worth keeping

- **Head-to-head only breaks a two-way tie.** With three teams level it is
  usually circular (A beat B, B beat C, C beat A), and a comparator that answers
  those three questions inconsistently makes `Array.sort` return an order that
  depends on input order. Three or more level → point difference.
- **A court holds one match.** `assignCourts` numbers the first `courts`
  playable matches and leaves the rest queued. Assigning per round instead put
  three simultaneous pool matches on court 1, because every pool has its own
  round 1.
- **Byes are slots, not special cases.** A team drawn against `{ from: "bye" }`
  wins the moment the bracket is built, which is why an 11-team draw needs no
  more code than a 16-team one.
- **`clearResult` clears downstream too.** Undoing a pool result empties the
  playoff matches that were seeded from it.
