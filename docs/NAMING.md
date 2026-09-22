# Product Naming

**Chosen name: `PB Card Deck`** (PB = Pickleball) — 2026-07-03 (final)

A plain, descriptive name. Single-tier: the app *is* "PB Card Deck" — the 1,729-card deck is
just "the deck," no separate sub-brand.

**Why descriptive is fine here:** the app is explicitly **personal-use, not for sale** (see the
in-app footer: *"made just for fun and personal use only - not for making sales"*). All the
trademark research below only mattered for a *commercial* launch — with no sales, there's no
brand to defend and no clearance homework needed. So we dropped the coined names (Paddol, Whimzy)
and went with the name that just says what it is.

The coined-name work (ThirdShot → Paddol → Whimzy) is kept below as the record of *why* those
paths were explored and abandoned — useful if this is ever commercialized.

> ℹ️ If this ever goes commercial, revisit a coined name (Whimzy was the front-runner:
> `whimzy.com` available, no conflicts) and do the [clearance homework](#clearance-status--homework).

---

## Naming journey — how we got to PB Card Deck

Six passes. The coined-name hunt (passes 1–5) mattered only for a commercial launch; pass 6
reframed it as a personal-use app and settled on a plain descriptive name.

### Pass 1 — descriptive pickleball names
Brainstormed ~50 names in five themes: dink-based (Dinkr, Dinkly…), card/deck/shuffle
(DinkDeck, DeckDink…), court/kitchen slang (KitchenPlay, StackUp…), rally/game-flow
(Rally, SideOut, ThirdShot…), and playful/made-up (Picklr, Volli, Poppl…).
First pick: **ThirdShot** — named after the *third shot drop*, pickleball's signature shot.
Premium feel, insider credibility.

### Pass 2 — combine two favorites
Asked for a **ThirdShot + DinkDeck** combination. Chose a *sub-brand* structure:
app = ThirdShot, the card deck = DinkDeck. Applied it to the app.

### Pass 3 — legal reality check (the pivot)
Trademark research blew up both names:
- **"ThirdShot"** — "Third Shot Drop" is a *registered* pickleball paddle/apparel brand, and
  "Third Shot Sports" also exists. Worse, "third shot" is a **descriptive** term → a weak,
  hard-to-register mark even without the incumbents.
- **"DinkDeck"** — "Dink Decks" by Picklepedia is *already* a digital pickleball card product
  (same category, near-identical name = textbook likelihood of confusion). "Dink" is heavily
  claimed across the sport.

Conclusion: every clever pickleball pun sits on top of someone else's mark. The strongest,
cheapest-to-defend trademark is an **invented/arbitrary word** that doesn't describe the sport.
Keep the pickleball tie in the tagline (SEO), out of the brand.

### Pass 4 — coined-name search + clearance pass
Generated ~16 invented words and ran a web + app-store + Crunchbase conflict pass on each.
Most short coined names were already taken (Volli → games venue, Popl → registered NFC brand,
Zylo → registered SaaS, Dabble → App Store word game, Plynk → Fidelity, Voleo → FINRA broker…).
Survivors with no obvious conflict: **Paddol, Plyngo, Kribble, Zibbl** (+ weaker Wompl/Jindl/Vurl).

**Picked `Paddol`** — the only survivor that still whispers the sport ("paddle") while being a
coined, defensible, arbitrary-ish mark. Best trade-off of marketable + low-risk. The deck
became **Paddol Deck** (dropping the legally-tainted "DinkDeck").

**One honest caveat on Paddol:** because it sounds like "paddle"/"padel," it isn't *purely*
arbitrary — there's mild descriptiveness + a whiff of confusion with paddle-sport apps
(Playtomic, PaddleTrac, Padel Mates). Still dramatically cleaner than ThirdShot/DinkDeck, but
not zero-risk.

### Pass 5 — evocative real-word blend → Whimzy
Paddol's two weak spots (taken `.com` + paddle sound-alike) prompted one more round, this time
for **coined words that *mean something*** (fun/play/twist) without touching pickleball or paddle.
Batch checked: Twistr (travel co), Frolik (TM), Fizzo (ByteDance app), Romply (registered TM),
Bantr (rec-sports app + WB TM), Zesto/Caper (existing cos) — all rejected. Survivors:
**Whimzy** and **Jubl**.

**Picked `Whimzy`** — coined spelling of *whimsy*, which literally describes the product
experience (draw a random twist card, shake up the game). No brand/TM conflict found, and
`whimzy.com` is **available** — rare for a real-word name, and it kills both of Paddol's
weaknesses at once. Deck = **Whimzy Deck**.

### Pass 6 — back to descriptive: PB Card Deck (final)
After landing on Whimzy, we reframed the whole exercise: the app is **personal-use, not for
sale** (its own footer says so). Trademark strength only matters when there's a business to
protect — with no sales, a coined mark is solving a problem we don't have. So we chose the
plainest descriptive name, **PB Card Deck** (PB = Pickleball), single-tier, no sub-brand.
The coined candidates stay documented in case it's ever commercialized.

---

## Clearance status — homework

Researched 2026-07-03 via web/RDAP/DNS. **This is not legal advice and not a formal clearance search.**

### What we checked (Whimzy)

| Check | Result |
|-------|--------|
| Existing app named "Whimzy" (App Store / Play / web) | None found ✅ |
| Company / obvious USPTO mark "Whimzy" | None found in web results ✅ (not a substitute for a TESS search) |
| Sound-alike / descriptiveness | 🟢 arbitrary re: the sport; "whimsy" is a common word but the spelling `Whimzy` is distinctive |
| `whimzy.com` | 🟢 **Available** (no DNS record) |
| `whimzy.app` | 🔴 Registered |

### Still on you before launch (the real homework)

- [ ] **USPTO TESS search** ([tmsearch.uspto.gov](https://tmsearch.uspto.gov)) for `Whimzy` + `Whimsy`
      in **classes 9 (software), 28 (games), 41 (entertainment)**.
- [ ] **Secure the domain** — grab `whimzy.com` (available) + register social handles @whimzy.
- [ ] **Attorney flat-fee clearance** (~$300–600) before spending money or filing.
- [ ] **File the trademark** once cleared (class 9 and/or 41). Use ™ now, ® only after registration.
- [x] **Repo + URL renamed** (2026-07-03) — GitHub repo `pickleball-shuffle` → `pb-card-deck`
      (GitHub auto-redirects the old slug); Vercel project → `pb-card-deck.vercel.app`. Old
      Vercel URL no longer resolves; re-install the PWA from the new URL.
- [ ] **(optional) rename local repo dir** `~/coding/pickleball-shuffle/` → cosmetic only, breaks local paths.

---

## Where the name lives (source of truth)

App branding (all say `PB Card Deck`):

| File | Field |
|------|-------|
| `app/public/manifest.json` | `name`, `short_name` |
| `app/app/layout.tsx` | `TITLE`, metadata title + template, `appleWebApp.title`, OG/Twitter |
| `app/app/(info)/{about,privacy,terms}/page.tsx` | body + metadata copy |
| `app/components/FeedbackPanel.tsx` | email subject + signature |
| `app/lib/shareImage.ts` | share-image watermark + share title |
| `app/app/icon.svg`, `app/app/page.tsx`, `app/public/icons/{app-icon,logo-mark}.svg` | `aria-label` / logo `alt` |
| `scripts/generate_cards.py`, `docs/data/cards.json` | deck `title` metadata ("PB Card Deck - The 1729 Deck") |

Docs / meta (workspace-wide rename, latest 2026-07-03): `README.md`, `app/README.md`,
`app/CLAUDE.md`, `CONTRIBUTING.md`, `docs/{index,ONBOARDING,BACKLOG}.md`,
`prompts/{00-scaffold,README}.md`, and `../dotfiles/docs/features/FEATURES.md`.

---

## Legal & trademark (why the earlier names died)

Researched 2026-07-02 (web/USPTO search — **not legal advice, not a clearance search**).

| Name | Risk | Conflicts |
|------|------|-----------|
| **ThirdShot** | High | "Third Shot Drop" (*registered* TM, pickleball paddles/apparel); "Third Shot Sports". Plus "third shot" is **descriptive** → weak/refusable. |
| **DinkDeck** | Highest | "Dink Decks" (Picklepedia) = digital pickleball flashcards, **same category**. "Deal and Dink" on-court card game. "Dink" heavily claimed (Dink Technologies owns PICKLEHEADS). |
| ThirdShot + DinkDeck combo | Highest | inherits both conflicts |
| **Paddol** | Low–moderate | no direct conflict found; only mild "paddle"/"padel" sound-alike risk (superseded) |
| **Whimzy** | Low | no direct conflict found; arbitrary re: the sport; `whimzy.com` available (front-runner if commercialized) |
| **PB Card Deck** *(chosen)* | n/a | descriptive; fine for a personal-use, not-for-sale app (no mark to defend) |

**Climate:** pickleball naming is litigious (National Pickleball League suits Oct 2025; NCAA v. NCPA).
The base mark **"PICKLE-BALL"** (Reg. 0999043, 1974) is itself under cancellation.

---

## Ideas considered (archive)

Kept for future rebrands / sub-brands.

### Full list by theme
- **Dink-based**: Dinkr, Dinkly, Dinko, Dinkit, Dinkster, GoDink, JustDink, DinkUp, DinkPro
- **Card / deck / shuffle**: DinkDeck, DeckDink, ShuffleDink, CardCourt, DeckPlay, ShuffleUp, CutTheDeck, WildCard Pickle, DrawPlay
- **Court / kitchen slang**: KitchenPlay, TheKitchen, Kitchenr, NVZ, CourtSide, BaselineUp, StackUp, Poach, ErneApp
- **Rally / game flow**: Rally, Rallyr, RallyUp, GameStack, NextServe, SideOut, ThirdShot, DropShot
- **Playful / made-up**: Picklr, Picklit, Pickly, Pikl, Volli, Voll, Paddld, Paddlr, Smashr, Poppl
- **Two-word**: Pickle Shuffle, Pickle Stack, Court Cards, Dink Deck, Rally Cards, Kitchen Cards, Paddle Play, Game Shuffle

### Coined-name clearance pass (2026-07-02)
Web + app-store + Crunchbase only — **not a USPTO clearance search**.

- **Rejected (existing brand/TM/app, often same class):** Volli (Volli Entertainment — games),
  Popl (registered, NFC cards), Zylo (registered, SaaS), Dabble (App Store word game), Plynk
  (Fidelity), Quibl, Voleo (FINRA broker app), Skwibl, Yonzo (game), Nuvoli, Froodl, Klynk.
- **No conflict found:** Paddol, Plyngo, Kribble, Zibbl, Wompl, Jindl, Vurl.

### Coined + evocative-blend passes (2026-07-03)
Two more rounds after Paddol. Same web/app-store/Crunchbase method (not a USPTO search).

- **Clean coined (round A):** Wibbl, Nabbl, Zubbl (all conflict-free, `.app` free) — but
  semantically empty; rejected Wyldcard (gaming co), Flipsy (resale co), Jambl (music app).
- **Evocative blend (round B):** rejected Twistr (travel co), Frolik (TM), Fizzo (ByteDance),
  Romply (registered TM), Bantr (rec-sports app + WB TM), Zesto/Caper (existing cos).
  **No conflict:** **Whimzy** (chosen — `whimzy.com` available) and Jubl (`jubl.com`/`.app` free).

### Sources
- Third Shot Drop — https://www.thirdshotdrop.com/
- Third Shot Sports — https://www.thirdshotsports.com/
- Dink Decks (Picklepedia) — https://picklepedia.org/dinkdecks/
- Deal and Dink — https://www.dealanddink.com/
- USPTO trademark search — https://tmsearch.uspto.gov/
- Pickleball trademark climate — https://secureyourtrademark.com/blog/national-pickleball-league-trademark-lawsuit/
- Paddle-sport apps (sound-alike context) — Playtomic, PaddleTrac, Padel Mates (App Store)
