# Recording a match

Every way the app records what happened on court, and how to get it back out.
Nothing here is uploaded anywhere - **every record lives on the device that made
it**, and the only way off the device is a file you export yourself.

---

## Three levels of record

| Level | How you start it | What gets recorded |
|---|---|---|
| **Casual** | Just play. When a game ends, the app asks whether to save it | Score, deck mode, winner, game-by-game results, played duration |
| **Officiated** | Home → **Track a match** | The above, **plus** an event/round label, singles or doubles, per-team timeouts and faults, the halfway side-switch - and a downloadable **match sheet** |
| **Event** | Home → **Tournaments** | Every match of the event, standings, the bracket, and a **change log** of every result, correction and clear with its time and the old score |

## It asks before it keeps anything

A finished match is **not** written automatically. `Save this match?` appears
when the match ends, and you can tell it to remember your answer:

| Preference | Behaviour |
|---|---|
| **Ask** (default) | Asks once per match |
| **Always** | Saves silently |
| **Never** | Never writes a match to the device |

Two details that matter:

- **Dismissing the dialog counts as "not this time", never as consent.**
- **It asks once per match, not once per game.** A best of 3 finishes three
  games; three dialogs for one match is nobody's idea of consent.

Nothing is uploaded either way - but "it stays on your phone" is still a promise
about *your phone*, so the first save asks.

## Track a match (coach / umpire mode)

Home has a `Play with cards` / `Track a match` toggle - one tap, switchable any
time.

**Setup:** singles or doubles · player or team names · an event/round label ·
points to win (11 / 15 / 21) · match length · twist cards on or off (off by
default).

**During the match:**

| Control | What it does |
|---|---|
| **Server indicator** | Which side serves, and **Server 1 or 2** - the real doubles rotation (Server 1 → Server 2 → side-out), including the single service turn the side that opens a game gets |
| **Timeout** (per team) | Logged with the score and time it happened |
| **Fault** (per team) | Logged the same way |
| **Side out** | Hands serve over explicitly |
| **Side switch** | The halfway reminder |
| **Pause** | Freezes the clock. Paused time is **not** counted as playing time |
| **Undo** | Every transition is undoable - side-outs included, not just the ones that change a number |

## The match sheet

One tap in Track a match downloads a plain-text sheet. It works off the live
match, so it is available the moment the match ends:

```
PICKLEBALL MATCH SHEET
Event: Saturday Social - Round 2
Format: doubles (official)
Date: 29/09/2026, 10:42:11

Sam & Priya  vs  Alex & Jordan
Games: 2 - 1   Winner: Sam & Priya

Game-by-game:
  Game 1:  11 - 7
  Game 2:  9 - 11
  Game 3:  11 - 6

Timeouts:  Sam & Priya 1, Alex & Jordan 2
Faults:    Sam & Priya 0, Alex & Jordan 1

Duration: 38 min
```

Plain text on purpose: anybody can read it, paste it, or keep it, with no app
and no format to open.

## Match history, streaks and achievements

- **Match history** holds the last **200** finished matches with score, mode,
  winner, per-game results and played duration. Official matches also carry the
  event label, the format, and timeout/fault counts.
- **Win streaks** are computed per **name** you type: current run, best-ever run,
  win rate, and recent results as dots. There are no accounts, so a name *is*
  the identity - type it the same way each time.
- **Achievements** are local milestones from your own counters (first draw, 100
  draws, a legendary card, a custom deck, 10 and 50 matches, daily challenges).
  No leaderboard, nothing to compare against anyone.

## Getting a record out

| Route | Format | Where |
|---|---|---|
| **Match sheet** | Text file | Track a match, during or after the match |
| **Share card** | PNG - square (feed), story 1080×1920, tall 4:5 | Share panel; previews live, then hands it to your phone's share sheet with a caption to paste |
| **History CSV** | `date, mode, team1, score1, team2, score2, winner, games, minutes` | Match history |
| **Event export** | CSV · Markdown · JSON · plain text, each with results, standings and the change log | A running or finished event |
| **Full backup** | One JSON file: custom decks + match history + events | Menu → Export backup, and Import to restore |

The share-card preview **is** the file: the canvas renders at full 1080 and is
only scaled by CSS, so what you see cannot drift from what gets shared.

## Where it is stored

All of it is `localStorage`, behind one module
([`app/lib/client-api.ts`](../app/lib/client-api.ts)) so the storage layer can be
swapped without touching a component.

| Key | Holds | Cap |
|---|---|---|
| `pickleball-shuffle-game` | The active game, for resume | 1 |
| `pickleball-shuffle-games` | Saved in-progress games | - |
| `pb-match-history` | Finished matches | 200 |
| `pb-tournaments` | Events, with their change logs | - |
| `pb-custom-decks` | Your own decks | - |
| `pb-favorites` | Starred card ids | - |
| `pb-stats` | Counters behind achievements | - |
| `pb-save-history` | Your ask / always / never answer | - |
| `pb-theme`, `pb-last-deck`, `pb-welcome-tour-seen`, `pb-beginner-intro-seen` | Preferences and one-time gates | - |

Consequences worth being clear about:

- **Clearing site data clears your history.** Export a backup before you do.
- **Records are per device and per browser.** There is no sync; that is the
  local-first trade-off, and the backup file is the intended way across.
- **Custom-deck cards use negative ids**, so a user card can never collide with
  the built-in 1-1729 id space.
