# Running a tournament

How to run a real event on a phone - 4 players or 50, with no signal and no
account. This is the user-facing guide. The engine is documented in
[`app/lib/tournament/README.md`](../app/lib/tournament/README.md) and the screens
in [`app/components/tournament/README.md`](../app/components/tournament/README.md).

> **See it first.** Tournaments → **Load demo** gives you a half-played 12-team
> day to poke at. It is a real event played through the real engine, not a
> fixture file, so everything in it behaves exactly as yours will.

---

## 1. Pick a format

| Format | Shape | Minimum | Use it when |
|---|---|---|---|
| **Round robin** | Everyone plays everyone | 3 teams | One group, up to about 10 teams |
| **Pools then bracket** | Mini round robins, then the top teams knock out | 6 teams | The usual shape for a big day |
| **Single elimination** | Lose once and you are out | 2 teams | You need a winner fast |
| **Double elimination** | A losers bracket gives everyone a second life, with a grand-final reset | 3 teams | Fairest knockout; allow more time |
| **Rotating partners** | Players enter alone, get a new partner every round, and **the score follows the person** | 4 players | A social mixer where nobody sits with the same partner all night |

## 2. Type who is playing - one paste

One entry per line. A line is either a **player** or an **already-formed pair**:

```
Sam
Priya
Alex & Jordan
Chris (m)
Dana (f)
```

- **`Alex & Jordan`** stays together all day.
- Loose names are paired for you by the **pairing** setting:
  **As listed** (1st with 2nd), **Random**, or **Balanced** (strongest with
  weakest).
- **`(m)` / `(f)`** markers only matter in a **mixed** division, where every pair
  is one of each. If the numbers do not balance, the app says up front how many
  pairs will be same-sex rather than silently making them.
- **Rotating partners** ignores pairs - everyone enters alone by design.

Divisions: **Open** (anyone with anyone), **Men's**, **Women's**, **Mixed**. A
division belongs to the event, so a club day that runs several draws is several
events sitting together in the list.

## 3. Set the numbers

Counts are **typed, not picked from a list** - a club with 11 courts or 7 pools
is not an edge case, it is Tuesday.

| Setting | Notes |
|---|---|
| **Courts** | How many games can run at once. Exactly this many matches go on court, numbered; the rest queue. |
| **Points to win** | 11, 15, 21 or anything you type. Win-by-two is on by default. |
| **Best of** | 1 for a single game, or 3 / 5 for a series per match. |
| **Pools** and **Advance from each pool** | Pools-then-bracket only. The form tells you the teams per pool and how many will be in the bracket as you type. |
| **Rounds** | Rotating partners only. You can add more rounds while you play. |
| **Cards** | Whether twist cards are available on the scorekeeper for event matches. Off suits a serious draw. |

## 4. Run it

The running event has tabs. **On now** is the default, because during an event
the only live question is what is on court and what to type when it ends.

| Tab | What it is for |
|---|---|
| **On now** | The matches on court right now, plus **Just finished** - the last few results - so the tab is not empty between rounds |
| **Schedule** | Every match, round by round; enter, edit or clear any score |
| **Standings** / **Players** | The table (on desktop it is a permanent rail, because people glance at it between every match) |
| **Bracket** | The draw as a tree: rounds as columns, byes resolved, rounds labelled Quarter-final / Semi-final / Final, connectors turning green as results land. It scrolls sideways on a phone; the shape is the information. Tap a match to enter or edit its score. |
| **Teams** / **Players** | Who is in, and their seed |
| **Changes** | The audit log - appears once anything has been changed |

### Two ways to score a match, deliberately

| | How | Why it exists |
|---|---|---|
| **Enter score** | Type the final score at the desk | A desk running eight courts does not want eight scoreboards |
| **Play** | Hands the match to the full scorekeeper - serve tracking, undo, timeouts, pause - and writes the result back when it finishes | One court being run properly, or a match that needs an official record |

### Standings, and how ties break

1. **Wins.**
2. **Head-to-head** - but *only* for a straight two-way tie. With three teams
   level it is usually circular (A beat B, B beat C, C beat A), and answering
   those three questions inconsistently makes the sort order depend on input
   order.
3. **Point difference.**

Pool tables draw the qualifying line where the bracket cuts.

## 5. Fixing mistakes

- **Any score can be edited or cleared, any time.**
- **Clearing a result clears everything downstream.** Undo a pool result and the
  playoff matches seeded from it empty out and re-seed when you re-enter it.
- **Every result, correction and clear is logged** with the time and what the
  score used to be, shown in the **Changes** tab and carried into every export.
  The next person to pick up the tablet can see that a score was changed.

## 6. Getting the results out

| Export | Good for |
|---|---|
| **CSV** | Excel / Numbers / Sheets |
| **Markdown** | Pasting into a club page, a README or a group doc |
| **JSON** | Re-importing, or doing your own thing with it |
| **Plain text** | A group chat |

Each contains results, standings and the change log. There is also **Share** for
copying the standings and the winner as text, and a **champion share card** as a
PNG for social.

## Things worth knowing

- **Byes are not special cases.** A team drawn against a bye wins the moment the
  bracket is built, which is why an 11-team draw needs no more handling than a
  16-team one.
- **A court holds one match.** Courts are assigned to the first playable matches
  across the whole event, not per round - otherwise three simultaneous pool
  matches all land on court 1, because every pool has its own round 1.
- **Seeds are the order you typed names in.** There is no rating yet; see the
  plan in the [README](../README.md#the-plan).
- **Everything is local.** An event lives in `localStorage` on the device that
  created it. Use **Export / Import backup** to move it, and be aware that
  clearing site data clears events too.
- **A played-in-app match trusts one invariant:** team 1 on the scorekeeper is
  always the match's team A. That is what makes writing the result back safe.
