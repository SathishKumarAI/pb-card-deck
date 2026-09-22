# STATUS — PB Card Deck

_Last written 2026-09-21. Read this first when you come back._

## Where I stopped

Branch `feat/premium-ui-and-manual`, PR #5 open against `main`. Build, types,
tests and lint all pass; every screen was checked in a real browser at 390 px
and 1280 px in both themes.

What the branch contains, in order:

1. **`fix(build)`** — the `.gitignore` line that hid the App Router from
   Tailwind (see Traps).
2. **`feat(ui)`** — design tokens, a calmer home and game screen, and the
   searchable manual (`lib/manual.ts` + `components/HelpPanel.tsx`).
3. **`fix(ui)` / `fix(a11y)`** — sheet focus rings, dialog focus targets.
4. **`feat(ui)`** — iOS glass materials, the pickleball-court backdrop, the
   scroll fixes, hover states, and the desktop two-column layouts.
5. **`feat(tournament)`** — the event engine and screens: five formats, pools,
   brackets, standings, courts, and a scorekeeper hand-off.

## Next action

Review and squash-merge PR #5, then delete the branch. Nothing is half-done
behind a flag.

## Traps that cost time here

1. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so `app/app/` silently stopped every class
   used only in `app/app/page.tsx` from being generated — no error, just a page
   missing half its layout and an `sr-only` line showing as visible text. After
   editing `.gitignore`, **restart the dev server**; Tailwind caches the list.
2. **Turbopack can serve a stale `globals.css`.** A new rule was on disk and
   absent from the served bundle, so a desktop layout silently collapsed. When a
   rule "does nothing", fetch the stylesheet the page actually loaded and grep
   it before debugging the rule.
3. **`.app-col` beats `lg:max-w-*`.** Both are single-class selectors and the
   custom class is defined after the utilities. Widen with `.app-col--wide`.
4. **On Windows the checkout has no `node_modules/.bin`** until you run
   `npm install` inside `app/`; `npm test` fails with `'vitest' is not
   recognized` before that.
5. **Verify CSS by measuring, not reading.** Every UI bug fixed this session
   (missing classes, a clipped card title, a focus ring on every sheet, the page
   scrolling behind a sheet) looked correct in the markup. `getComputedStyle`
   and a scripted `window.scrollTo` found them in seconds.
6. The shell scripts show as modified in `git status` on Windows — that is only
   the 755 → 644 file-mode bit. Leave them unstaged.

## Tournament mode, in one paragraph

`lib/tournament/` is a pure engine (31 tests) and `components/tournament/` is
its UI; both have change-to-file READMEs. The whole thing turns on one idea: a
match holds two **slots**, not two teams, and a slot says where its team comes
from (a seed, the winner of a match, the loser of a match, a bye). `resolveSlots`
fills in whatever is knowable, which is how brackets advance, byes resolve,
pools seed the playoff, and a double-elimination reset gets dropped when it is
not needed. Add a format by writing wiring, not advance logic.

## Design system, in one paragraph

Surfaces are glass materials (`.mat-thin` / `.mat-regular` / `.mat-thick`), not
divs with a background. Radius carries hierarchy (`--r-chip` → `--r-hero`),
elevation is `--elev-1..3`, text on the accent is `--accent-ink`, anything that
counts gets `.tnum`. Hover lives only inside
`@media (hover: hover) and (pointer: fine)`. One scroll container per page;
inner scrollers use `.scroll-area`; every dialog calls `useScrollLock`. Full
rules in `app/CLAUDE.md`.

## Open follow-ups

- The court backdrop is fixed-position CSS gradients. If it ever needs to be
  richer (a real net, a paddle), move it to one inline SVG rather than adding
  more gradient layers.
- Plane: COD-209 and COD-210 are In Review; move both to Done on merge.
