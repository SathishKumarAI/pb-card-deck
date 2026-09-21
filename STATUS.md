# STATUS — PB Card Deck

_Last written 2026-09-21. Read this first when you come back._

## Where I stopped

Branch `feat/premium-ui-and-manual`, three commits, ready for a PR into `main`.
The app builds, 75 tests pass, and every screen below was checked in a real
browser at 390 px in both themes.

- **Design tokens** now exist in `app/app/globals.css` and the screens use them:
  radius by role (`--r-chip/-ctl/-panel/-hero`), `--elev-1..3`, `--accent-ink`,
  `.tnum` for anything that counts, `.eyebrow` for labels.
- **Home** has one identity, one sentence, one primary action (Start playing,
  which remembers the last deck) and a level/theme hierarchy instead of eight
  equal choices.
- **Help** is a header button on every screen. Content is plain data in
  `app/lib/manual.ts` (30 answers), rendered by `app/components/HelpPanel.tsx`
  with search. `RulesPanel.tsx` is gone; its five tabs were carried over.

## Next action

Open the PR (`gh pr create --base main`), then look at the two follow-ups below.

## Traps that cost time here

1. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so `app/app/` silently stopped every class
   used only in `app/app/page.tsx` from being generated - no error, just a page
   missing half its layout and a `sr-only` line showing as visible text. Fixed in
   `9767722`. After editing `.gitignore`, **restart the dev server** - Tailwind
   caches the ignore list.
2. **On Windows the checkout has no `node_modules/.bin`** until you run
   `npm install` inside `app/`; `npm test` fails with
   `'vitest' is not recognized` before that.
3. **Verify CSS by measuring, not reading.** All three UI bugs fixed this session
   (missing classes, clipped card title, focus ring on every sheet) looked
   correct in the markup. `getComputedStyle` found them in seconds.
4. The shell scripts show as modified in `git status` on Windows - that is only
   the 755 → 644 file-mode bit. Leave them unstaged.

## Open follow-ups

- `app/components/GameSettings.tsx` and `app/components/DeckModeSelector.tsx` are
  orphans (nothing imports them) and the last files still using
  `bg-green-600 text-white`. Delete or fold in.
- The stray `app/app/package.json` + `package-lock.json` are still there; deleting
  them removes the reason the bad ignore rule existed in the first place.
- Plane: COD-209 (the Tailwind fix) and COD-210 (this pass) move to Done on merge.
