# Validation & testing report — 2026-07-01

Covers the work shipped on branch `feat/wave1-prod-hardening`: **Understand & Play v1**,
**Coach / Umpire "Track a match" mode**, the **Track-a-match scroll fix**, the **doubles
serving UX + rally option**, and a full **documentation audit**. Captures *what* was
tested, *how*, the *results*, and the *why/how* reasoning behind the design choices.

---

## 1. What was built (scope)

| Wave | What | Why |
|---|---|---|
| Understand & Play v1 | First-run WelcomeTour, tap-to-define jargon, per-card "?" explainer, always-shown "What to do", in-game hint, Rules "Why & how" tab | Let a person with zero pickleball knowledge open the app and play in <60s |
| Track a match (coach/umpire) | Home toggle, official match setup, server rotation, timeouts/faults, side-switch, match-sheet export | Give coaches/umpires a real match recorder alongside the party game |
| Scroll fix | Top-align the home on the Track tab | Long setup form was centered and could scroll off short screens |
| Doubles UX + rally | Dynamic serve button, Side-out/Rally scoring choice, in-app + doc explainer | "I can only score one team / how do I record the 2nd server?" — explain the rules and offer rally scoring |
| Docs audit | Cross-checked every doc vs code, fixed drift | Docs had stale counts, missing features, wrong CI/PR steps |

## 2. How it was validated

Three independent methods, matched to the risk:

1. **Unit tests (`npm test` → vitest)** — the pure game engine and the local store.
2. **Type + build (`npm run build`)** — full Next.js 16 production compile (type-checks the whole app).
3. **Lint (`eslint`)** — style/react-hooks rules.
4. **Live browser (Chrome DevTools MCP, 390px mobile)** — real user flows end-to-end.
5. **Doc audit (3 parallel review agents)** — every doc cross-checked against ground-truth facts read from code.

## 3. Results

### Automated
| Check | Result |
|---|---|
| Unit tests | **64 passed / 64** (5 files: `game`, `cards`, `cards-data`, `client-api`, `a11y`) |
| Production build | **Compiled successfully** (Next.js 16.2.6) |
| Lint — new/changed files | **0 errors** |
| Lint — repo-wide | 1 error, **pre-existing** in `components/WinCelebration.tsx` (`react-hooks/set-state-in-effect`), untouched by this work; build still compiles |

New tests added this wave:
- `lib/game.test.ts` — official doubles rotation (server 1 fault → server 2 same team; server 2 fault → other team server 1), singles/casual pass serve straight over, casual rotation unchanged, match log counts.
- `lib/client-api.test.ts` (new) — `addMatch` persists official fields (event, format, timeouts, faults); casual matches carry none; `matchSheet()` renders the key facts and marks unfinished games.

### Live browser checks (what was actually clicked)
- **Onboarding:** first-run tour shows once → Skip/Next/Back → dismiss persists; replay from Rules → "Why & how" tab.
- **Cards:** draw decrements deck (1729→1728), score increments, `?` explainer opens with all 3 sections + plain category, tap-to-define popover ("Forehand"/"Rally") works, "What to do" shown.
- **Track a match:** setup form (format, players, event, points, length, scoring, cards) — every control toggles correctly (validated with awaits between clicks; note below). Start → official game.
- **Doubles rotation:** Eagles Server 1 → serve button → Server 2 (same team) → serve button → serve passes to Hawks Server 1. Timeout/fault counters increment. Card UI correctly hidden when cards off. Match saved to history.
- **Scroll fix:** Track tab `main` is `flex-start`, document scrollable, Start button reachable; Cards tab stays centered.
- **Regression:** casual card play fully intact, zero coach-mode leakage (no official controls on a normal game).

### Known validation caveat (documented, not a bug)
Driving React controls with **synchronous scripted clicks** batches into one render and misreports intermediate state (a test-harness artifact). Two consequences, both handled:
- The win→history→match-sheet path was verified by **unit tests** instead of scripted clicks.
- UI control validation used **awaits between interactions** so each render commits before reading.

## 4. Doubles logic — the reasoning (why it looked "broken")

Reported: *"two players playing and I can update the score of only one; how do I record the second server?"*

**Finding: not a bug — traditional side-out scoring, under-explained.**
- Under side-out scoring **only the serving team can score**, so only one team's score moves. Correct rules; the app never said so.
- The two-server rotation ran only in official mode and the serve button said "Side out" even for the server-1→2 step (which is *not* a side-out).

**Fixes:** dynamic serve button that names the next event ("Server 1 lost — 2nd server serves" vs "Side out — {team} serves"), a **Rally scoring** option so either team can score every point, an in-app Rules explainer, and a full [DOUBLES-SCORING.md](DOUBLES-SCORING.md) with the model, the button-press cheat-sheet, and the design reasoning. Intentional simplification (first service turn starts at Server 1, not the strict "start on server 2") is documented.

## 5. Documentation audit — what was wrong, what was fixed

Every repo doc was cross-checked against code by review agents. Corrections applied:
- **README.md** — removed a non-existent `backend/` directory reference.
- **app/README.md** — replaced badly stale per-category (`20` each) and deck-mode (`80/100/60/60`) counts with real numbers (Family 686 / Party 862 / Drill 504 / Tournament 545 / Chaos 1,729); added Understand-&-Play and Track-a-match coverage; refreshed the file-structure block; fixed points options to 7/11/15/21.
- **docs/ONBOARDING.md** — added the missing `npm test` step to CI + pre-PR lists; fixed the card-editing workflow to the `scripts/generate_cards.py` generator; updated the Key Files table.
- **CONTRIBUTING.md** — added `npm test` to the pre-PR checklist.
- **docs/index.md** — replaced the dead placeholder feedback-form link.
- **app/CLAUDE.md** — completed the components/lib structure inventory.
- **docs/TICKETS.md / BACKLOG.md** — flipped shipped items (onboarding tour, unit tests, share image; F063/F075/F076/F126) from planned/wip to done.
- `prompts/` left as-is — historical build-recipe record, intentionally not updated.

## 6. Deploy status

All work committed on `feat/wave1-prod-hardening`. **Production deploy is owner-gated:**
the Vercel CLI isn't installed / no saved auth, and the sandbox `gh` token is invalid, so
push + deploy need the owner's interactive credentials:

```
gh auth login
git push -u origin feat/wave1-prod-hardening   # → Vercel preview (if Git-connected)
./deploy-vercel.sh                              # → vercel --prod from repo root
```

## 7. Outstanding / follow-ups

- [ ] Push + production deploy (owner auth).
- [ ] Pre-existing `WinCelebration.tsx` lint error (react-hooks) — optional cleanup, unrelated to this work.
- [ ] Optional: strict tournament "first service turn starts on server 2" rule (currently simplified; see DOUBLES-SCORING.md).
