# STATUS — PB Card Deck

_Last written 2026-09-22. Read this when you come back._

## Where things stand

**Merged and deployed.** PR #5 squash-merged to `main` as `33d6f12`, and the
colour + docs pass on top of it. Nothing is half-finished, nothing sits behind
a flag.

| | |
|---|---|
| Live | https://pb-card-deck.vercel.app |
| Tests | 144 (engine, tournaments, streaks, contrast, a11y, board rendering) |
| Gates | `npm test` · `npm run contrast` · `npm run lint` · `npm run build` |
| Default theme | **light**; dark and auto are one tap away and persist |

## What the app does now

- **Cards + scorekeeper** — 1,729 twist cards, side-out or rally scoring, real
  doubles serve rotation, pause, undo, match lengths, TV score.
- **Track a match** — coach/umpire mode: timeouts, faults, a downloadable match
  sheet.
- **Tournaments** — five formats (round robin, pools → playoff, single and
  double elimination, rotating partners), a live bracket tree, editable scores
  with an audit log, exports in four formats, divisions including mixed pairing,
  and a demo event.
- **Help** — a searchable manual of plain-language answers, reachable from every
  screen, plus tap-to-define pickleball terms.
- **Sharing** — win / streak / champion cards as PNGs at Instagram and WhatsApp
  sizes, handed to the phone's share sheet.

## Next action

Nothing is pending. Pick from the roadmap tables in `README.md` ("Where it could
go next") or `app/README.md` — each row says why that idea is not there yet.

The one piece of known debt: **`app/app/page.tsx` is past the 500-line ceiling**
this workspace sets. Tournament code was deliberately kept out of it; the game
screen is the next split.

## Traps that cost time here

1. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so `app/app/` silently stopped every class
   used only in `page.tsx` from being generated — no error, just a page missing
   half its layout. Restart the dev server after editing `.gitignore`; Tailwind
   caches the list.
2. **Turbopack can serve a stale `globals.css`.** A new rule was on disk and
   absent from the served bundle twice this session. When a rule "does nothing",
   fetch the stylesheet the page actually loaded and grep it before debugging
   the rule.
3. **`.app-col` beats `lg:max-w-*`** — both are single-class selectors and the
   custom class is defined after the utilities. Widen with `.app-col--wide` or
   `.app-col--event`.
4. **Measure, don't infer.** Every UI bug fixed this session looked correct in
   the markup: a missing class, a clipped card title, a focus ring on every
   sheet, the page scrolling behind a dialog, a serve rotation out by one.
   `getComputedStyle`, a scripted scroll, and `npm run contrast` found them.
   The contrast script itself had a bug that made both themes report identical
   numbers — check the tool as carefully as the thing it measures.
5. **Windows phantom file modes** are silenced with `core.fileMode=false`
   (already set locally). Without it every `git status` shows the `.sh` files as
   modified.
6. **On Windows the checkout has no `node_modules/.bin`** until `npm install`
   runs inside `app/`.

## The rules the code now encodes

Recorded properly in `app/CLAUDE.md`; the short version:

- Surfaces are glass materials (`.mat-thin/regular/thick`), radius carries
  hierarchy, elevation is three tokens, `--accent-ink` for text on accent,
  `.tnum` for anything that counts.
- Light is the default palette on `:root`; dark overrides it.
- Colour is measured — `npm run contrast` fails below WCAG threshold.
- One scroll container per page; inner scrollers use `.scroll-area`; every
  dialog calls `useScrollLock`.
- Hover only inside `@media (hover: hover) and (pointer: fine)`.
- One primary action per screen; a confirmation renders where its button is.
- Every state transition goes on the undo stack, not just the ones that change
  a number.
- Serve rules follow the rulebook, including the single first service turn.
