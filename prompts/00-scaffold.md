# Scaffold the PB Card Deck app

You are a senior full-stack engineer. Your objective is to scaffold a **local-first**
Next.js web app - a pickleball twist-card game + scorekeeper - with a clean,
mobile-first foundation that later feature prompts will build on.

<context>
  <product>A phone-first web app: players draw "twist" cards mid-match and keep
  score with real pickleball rules. Used courtside, often offline.</product>
  <constraints>No backend, no login, no database. All state in localStorage,
  isolated behind ONE data module so it could be swapped later.</constraints>
  <stack>Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4,
  lucide-react for icons. Use the latest Claude models if any AI is added.</stack>
</context>

## Instructions
1. Create a Next.js 16 + TypeScript + Tailwind app in `app/` (`npx create-next-app`).
2. Add `lucide-react`. Do not add a DB/auth/ORM.
3. Establish **theme tokens** as CSS variables in `globals.css` for dark (default)
   and light via `[data-theme]`: `--bg, --bg-card, --bg-elevated, --border, --text,
   --text-secondary, --text-muted, --accent, --blue, --red, --yellow`. Use soft
   off-black / off-white (no pure `#000`/`#fff`) to reduce eye strain.
4. Create the folder layout: `app/` (routes), `components/`, `lib/` (`cards.ts`,
   `game.ts`, `client-api.ts`, `sounds.ts`), `public/` (`cards.json`).
5. Add `npm run dev` binding `0.0.0.0` for phone testing on the LAN.

## Constraints
- MUST keep all persistence behind `lib/client-api.ts` (the swap point).
- MUST be mobile-first and theme-aware from line one.
- MUST NOT introduce a backend, auth, database, or any secret.
- MUST NOT use emoji as UI icons - use lucide-react.

## Output format
The created/changed files as paste-ready code, then the exact commands to run.
First reason in a `<thinking>` block about structure, then produce the files.
