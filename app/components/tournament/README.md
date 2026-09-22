# `components/tournament` — the event screens

The engine (`lib/tournament/`) decides what is true; these decide what is on
screen. Nothing here computes a schedule or a standing.

## Change → file

| Change | File |
|---|---|
| The events list, or what happens on open / delete | `TournamentHome.tsx` |
| The create-an-event form: fields, name parsing, pairing | `TournamentSetup.tsx` |
| Tabs of a running event, sharing, the champion banner | `TournamentScreen.tsx` |
| How one match looks, and score entry | `MatchCard.tsx` |
| The standings table and its columns | `StandingsTable.tsx` |
| Bracket drawing and its horizontal scroll | `BracketView.tsx` |

`TournamentHome` is the only one that touches storage
(`listTournaments` / `saveTournament` / `deleteTournament`), so `page.tsx` stays
the game and never grows a second app inside it.

## Decisions that are easy to undo by accident

- **"On now" is the default tab.** During an event the only live question is
  what is on court and what to type when it ends. Standings are for between
  rounds.
- **Names go in as one paste**, because the slow part of running a 50-person
  event is typing. A line is a player (`Sam`) or an existing pair
  (`Sam & Priya`); `TournamentSetup.parseEntries` owns that split.
- **Two ways to score, deliberately.** `Enter score` is for a desk running eight
  courts; `Play` hands the match to the scorekeeper and writes the result back
  (`page.tsx`, `startTournamentMatch` + the write-back effect). Removing either
  breaks one of the two audiences.
- **The bracket scrolls sideways on a phone** and does not restack, because the
  shape is the information.
- **An open event takes the full width**, including on desktop where the home
  screen is otherwise two columns — a dashboard is not a sidebar. It uses
  `.app-col--event` (72rem, 84rem past 1440px), not the reading column.
- **Standings are a permanent rail on desktop, not a tab.** People glance at
  them between every match, and the 20rem beside the match list was empty on
  every other tab anyway. The tab still exists on mobile (`mobileOnly`).
- **The header is one row.** It was a 280px stack that pushed the actual work
  below the fold: back, title, meta, champion chip, progress and the actions
  all share it now.
- **"On now" fills its space with `Just finished`** when few matches are live.
  Between rounds the tab was a single card in an empty field; the last six
  results are what a desk actually wants to see there.
- **The setup form is two explicit columns** (settings | who is playing), not
  fields flowing into a 2-col grid — the fields differ so much in height that
  flow left one side empty 300px at a time.
- **Counts quick-fill is honest about what it makes.** "Use 8 numbered teams"
  writes 8 numbered PAIRS in a doubles draw; writing 8 single names there
  silently produced 4 teams.
