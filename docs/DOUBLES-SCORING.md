# Doubles scoring & serving — how it works, and why

**Audience:** anyone confused by "I can only add a point to one team" or "how do I record the second server?" This doc explains real pickleball doubles scoring, how this app models it, exactly which button to press for each event, and the reasoning behind the design.

> TL;DR — In traditional (side-out) scoring **only the serving team can score a point.** That's why tapping the other team doesn't add to their score. To record the serving side *losing* a rally, use the **serve button** (it advances to the 2nd server, then side-outs). Prefer everyone-scores? Pick **Rally** scoring in match setup.

---

## 1. The two ways to score

Pickleball has two scoring systems. The app supports both (setup → **Scoring**, or `config.sideOutScoring`).

| | Side-out (traditional) | Rally |
|---|---|---|
| Who can score | **Only the serving team** | **Whoever wins the rally** |
| Losing a rally while serving | No point for anyone; serve changes | Opponent gets the point |
| Typical target | 11, win by 2 | 15 or 21 |
| App default | ✅ yes | opt-in |

**This is the root of "I can only update one player."** Under side-out scoring that is *correct* — the receiving team physically cannot score until they win the serve back. If you want either team to score on every rally, choose **Rally** in the match setup; then tapping either team adds a point directly.

## 2. The two-server rule (doubles)

In doubles each team has **two servers**. A team's *service turn* runs through both partners before the serve passes over:

1. **Server 1** serves. Every rally they win = **+1 point** (server 1 keeps serving, partners switch sides).
2. Server 1 **loses** a rally → the serve goes to **Server 2 on the same team** (not the opponents yet). No point changes hands.
3. Server 2 serves. Wins = +1; **loses** → **side-out**: serve passes to the *other* team, starting at their Server 1.

So a full service turn is: `Server 1 → (fault) → Server 2 → (fault) → side-out to opponents`.

> **Real-rule footnote (intentional simplification):** at the very start of a game the first serving team gets **only one server** for that first turn (they "start on server 2"). This app starts every service turn at Server 1 for clarity. For casual and most club play this is immaterial; a strict tournament umpire should note it. Tracked in [BACKLOG](BACKLOG.md) as a possible refinement.

## 3. How the app models it

The engine (`lib/game.ts`, pure functions) keeps a **team-level** score plus serving state — it does **not** track individual player names within a team, only which team and which server (1 or 2) is up:

- `score: { team1, team2 }` — points per team.
- `servingTeam: 1 | 2` and `serverNumber: 1 | 2`.
- `addScore(game, team)` — if side-out scoring and you tap the **non-serving** team, it's treated as the serving side losing the rally and routes to `sideOut()` (no point). Tap the **serving** team → +1.
- `sideOut(game)` — the rotation. **In official doubles:** `serverNumber 1 → 2` (same team); `serverNumber 2 → other team, server 1`. In singles / casual play it just passes the serve straight over.
- `serverLabel(game)` — "Server 1/2" (doubles) for the on-screen indicator.

**Why team-level, not per-player?** The scoreboard in pickleball is a team score (e.g. `6–3`). Individual player identity doesn't affect the score; the only per-player concept that matters to scoring is *which server (1 or 2)* is up, which we track explicitly. Tracking two named players per team would add state and UI with no scoring benefit — deliberately out of scope.

## 4. Where the full rotation is available

| Mode | Doubles behaviour |
|---|---|
| **Track a match** (coach/umpire) | Full two-server rotation, server indicator, side-out button, timeouts/faults. Use this for real matches. |
| **Play with cards** (casual) | Lightweight: side-out passes the serve straight over (no 2nd-server step) so the party game stays fast. |

If you came from the card game and expected the 2nd-server rotation, switch the home toggle to **Track a match** → **Doubles**.

## 5. Exactly which button to press

**Side-out scoring, doubles, in Track-a-match:** you act on the **serving side's result** with two buttons — you never tap the opponent. The score tiles are read-only in this mode.

| What happened on court | What you press |
|---|---|
| Serving team **won** the rally | **"{Serving team} won"** → +1 point |
| Serving team **lost**, on **Server 1** | **"{Serving team} lost → 2nd server serves"** |
| Serving team **lost**, on **Server 2** | **"{Serving team} lost → side out to {other team}"** |
| A team called a **timeout** | That team's **Timeout** button |
| You need to log a **fault** | That team's **Fault** button |
| Miss-tap / wrong score | The **−1** under the score, or **Undo** in the top bar |

The **"lost"** button **relabels itself** based on the current server (→ 2nd server, then → side out), so you always press one clearly-labelled control. The serving status card above shows which server is up and what a fault does next. (In **Rally** mode both score tiles stay tappable — tap whoever won.)

**Rally scoring:** simply tap whichever team won the rally. Either team can score any point.

## 6. Design reasoning (the why)

- **Correctness first, gated to keep the party game light.** The authentic two-server rotation lives behind `config.officialMode` so casual card play — where people just want quick points between twist cards — isn't burdened with server tracking. Coaches/umpires opt in.
- **One clearly-labelled action beats two ambiguous ones.** Earlier the button just said "Side out," which is wrong for the server-1→2 step (that's *not* a side-out). A dynamic label that names the *next* event removes the guesswork the user reported.
- **Offer rally scoring rather than fight the rules.** "I can only score one team" is the *correct* feel of side-out scoring; the honest fix is to explain it and offer rally scoring for those who want every-point-counts.
- **Team-level state = fewer bugs.** The pure engine stays small and fully unit-tested (rotation + logging covered in `lib/game.test.ts`); no per-player bookkeeping to drift.
- **Local-first, unchanged.** All of this is client-side state on the existing `GameSession`; no backend, no new persistence beyond the match record.

## 7. Verification

- Unit tests: `lib/game.test.ts` — first-server fault → Server 2 (same team); second-server fault → other team / Server 1; singles & casual pass serve straight over; casual rotation unchanged. `lib/client-api.test.ts` — official fields + match sheet.
- Live browser check: Eagles serving → Server 1 → serve button → Server 2 → serve button → serve passes to Hawks Server 1. Timeout/fault counters increment. Card UI hidden when cards off.

See [VALIDATION-REPORT.md](VALIDATION-REPORT.md) for the full test/validation run.
