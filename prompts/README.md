# Prompt Library - build PB Card Deck to production

A set of **paste-ready, engineered prompts** for an AI coding agent (Claude Code)
to rebuild this app from scratch and harden it for production. Each prompt is
self-contained and follows one structure - role + objective, XML-tagged context,
numbered instructions, MUST/MUST NOT guardrails, explicit output format, and a
think-then-answer step.

## How to use

1. Open a prompt file, replace any `{{placeholder}}`, and paste it into the agent.
2. Run them **in order** - each assumes the previous ones exist. Build the scaffold
   first, then features, then bug-fixes, then production hardening.
3. After each prompt: `npm run build` must pass and the change must be verified in
   the running app before moving on.

## Build order

| Phase | File | Produces |
|---|---|---|
| 0 | [`00-scaffold.md`](00-scaffold.md) | Next.js app, stack, structure, theming tokens |
| 1 | [`features/01-cards-and-deck-modes.md`](features/01-cards-and-deck-modes.md) | Card data model, 200 cards, 5 deck modes |
| 2 | [`features/02-card-draw-3d-flip.md`](features/02-card-draw-3d-flip.md) | Draw + 3D flip card |
| 3 | [`features/03-scoring-engine.md`](features/03-scoring-engine.md) | Pure pickleball scoring engine |
| 4 | [`features/04-game-shell-and-topbar.md`](features/04-game-shell-and-topbar.md) | Game screen, top bar, settings |
| 5 | [`features/05-custom-decks.md`](features/05-custom-decks.md) | User-authored decks (localStorage) |
| 6 | [`features/06-match-history.md`](features/06-match-history.md) | Saved match history |
| 7 | [`features/07-favorites.md`](features/07-favorites.md) | Persistent favorite cards + panel |
| 8 | [`features/08-resume-game.md`](features/08-resume-game.md) | Resume an in-progress game |
| 9 | [`features/09-feedback.md`](features/09-feedback.md) | In-app feedback |
| 10 | [`features/10-theming-and-motion.md`](features/10-theming-and-motion.md) | Dark/light, animation system |
| 11 | [`features/11-pwa-and-offline.md`](features/11-pwa-and-offline.md) | PWA + service worker |
| 12 | [`features/12-mobile-hardening.md`](features/12-mobile-hardening.md) | iOS/Android/browser fit |
| 13 | [`features/13-backup-export-import.md`](features/13-backup-export-import.md) | JSON export/import |
| B | [`bugfixes/known-bugs.md`](bugfixes/known-bugs.md) | Prompts for every bug we hit |
| P | [`production/production-readiness.md`](production/production-readiness.md) | Tests, CI, a11y, perf, monitoring |

## Conventions every prompt assumes

- **Local-first**: no backend, no login. All state in `localStorage` behind one
  data module. (See `00-scaffold.md` for the rationale.)
- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
  lucide-react. Latest Claude models when any AI is involved.
- **Quality bar**: `npm run build` clean, mobile-first, theme-aware, accessible,
  `prefers-reduced-motion` respected.

## Prompt-engineering structure (used by every file here)

Role + single objective → XML-tagged `<context>` → numbered Instructions →
MUST/MUST NOT Constraints → explicit Output format → "reason in `<thinking>` first."
This mirrors `~/coding/docs/templates/prompt-skeleton.md`.
