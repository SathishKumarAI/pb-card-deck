# Scoring UX research — how the best pickleball apps keep score for beginners

**Date:** 2026-07-01 · **Purpose:** decide how to redesign our score UI so non-IT people and
beginners can keep score in doubles without learning side-out/server rules. This captures the
market research, the 2026 rules context, the options weighed, and the decision we implemented.

---

## The problem

Our old score UI showed two tiles labelled "add a point to Team X." That only makes sense if you
already know **side-out scoring** (only the serving team scores; tapping the other team is a
side-out, not a point) and the **two-server doubles rotation**. Beginners don't, so it felt broken:
"I can only score one team." See [DOUBLES-SCORING.md](DOUBLES-SCORING.md).

## What the leading apps do (survey)

| App | Beginner scoring pattern | Serve/position display |
|---|---|---|
| **Dropshot** (godropshot.com) | "Just tap the team that won the rally — Dropshot handles score, server, side." One tap, everything derived. | Score, server & side update instantly on watch/board. |
| **Pickleball Referee App** | Tap the **court side (left/right)** that won the rally → score, current server & receiver update automatically. | Spatial: you tap where it happened on court. |
| **Side Out** (Apple Watch) | Swipe up/down to score; quick gesture to undo. | **Green indicator** shows current server + service box (1 or 2). |
| **Pickleball Score Counter** (Storq Labs) | "Tap your side when you win — the app handles the rest." | Clear server indicator, no explanation. |
| **Pickleball Calculator** (web) | +/- buttons; **you** must switch to server 2 then side-out yourself. | Three-number `x-y-z` shown; user tracks rotation. |

**Convergence:** every well-reviewed app uses **"tap who WON the rally,"** and the app applies the
rules. None make beginners manage side-out/server manually. Our old +/- ("add a point") model is the
outdated, confusing pattern (the Pickleball-Calculator style).

## Rally vs side-out scoring (2026 rules context)

- **Side-out** (only the serving team scores) is still the historical default and what most rec play
  uses. **Rally** scoring (every rally = a point) is increasingly offered.
- The **2026 USA Pickleball rulebook** made rally scoring cleaner ("a point is a point" — the
  receiving team can now score the game-winning point) and allows it as a **provisional** tournament
  option (not in championship/double-elim events).
- **Major League Pickleball reverted rally → side-out in 2026.**
- **Decision:** keep **side-out as the default**, offer **rally** as an opt-in (already shipped in the
  Track-a-match setup via `config.sideOutScoring`).

## Options weighed

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. Keep +/- "add a point" | Familiar to existing users | Requires rule knowledge; the reported confusion | ❌ reject |
| B. **Tap the team that won the rally** (Dropshot/Referee) | Zero rules knowledge; engine already routes it; tiny change | Score may not move on a side-out → needs narration | ✅ **adopt (default)** |
| C. Court-side (left/right) spatial tap (Referee app) | Maps to the physical court; great for umpires | Bigger UI; less intuitive for a phone-on-a-bench | ✅ adopt lightweight (net-divider framing in Track-a-match) |
| D. Rally scoring everywhere | Simplest mental model (either team scores) | Not the standard; MLP reverted it | ✅ offer as opt-in only |
| E. Voice / large announced score (Side Out green indicator + call) | Beginners *hear/see* the state; accessibility | Can annoy; needs opt-in | ✅ adopt as off-by-default setting |

## Decision — what we implemented

1. **Default: "tap the team that won the rally."** Tiles relabelled from "add a point" to "who won,"
   with a **consequence narration** line after each tap ("Point Eagles 4–2" / "Side out — Hawks serve,
   server 1"). The engine (`addScore`) already scores-or-side-outs on the tapped team, so this is a
   framing + feedback change with **no behaviour change**.
2. **Persistent serve badge** — a ball icon on the serving team plus **server-1/2 dots** (`● ○`) in
   doubles, like Side Out's green indicator. The two-server rule becomes visible, not verbal.
3. **Court-side framing in Track-a-match** — a **NET divider** between the two tiles + "tap the side
   that won" caption, echoing the Referee app's spatial model, without a full court redraw.
4. **Voice announce (opt-in)** — `config.announceScore` speaks the score after each point (Web Speech
   API). Off by default. Large on-screen score already exists via the TV / big-score display.
5. **Rally scoring** — opt-in in Track-a-match setup (shipped earlier).

## Why this is the right call

- Matches the pattern every top-reviewed app converged on, so it's proven with real beginners.
- Lowest-risk high-impact change: the hard logic already exists in the pure engine; we improved the
  *framing and feedback*, which is where the confusion lived.
- Keeps experts happy: official controls, server dots, and rally/side-out choice all remain.
- Stays local-first — pure client-side UI/state, no backend.

## Sources

- Dropshot — https://godropshot.com/
- Pickleball Referee App — https://pickleballrefereeapp.com/
- Side Out (App Store) — https://apps.apple.com/us/app/side-out-pickleball/id1671243214
- Pickleball Score Counter (Storq Labs) — https://pickleball-scoreboard.storqlabs.com/
- Pickleball Calculator — https://pickleballcalculator.com/pickleball-scorekeeper-app/
- JudgeMate — Rally vs Side-Out scoring — https://www.judgemate.com/en/guides/how-pickleball-scoring-works
- USA Pickleball 2026 rulebook change doc — https://usapickleball.org/docs/rules/USAP-Rulebook-Change-Document.pdf
- MLP eliminates rally scoring (2026) — https://thekitchenpickle.com/blogs/news/major-league-pickleball-announces-major-rule-changes

See [VALIDATION-REPORT.md](VALIDATION-REPORT.md) for how the implementation was tested.
