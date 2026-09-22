"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, DeckMode, DECK_MODES, getFilteredCards, getDeck, shuffleArray, SKILL_LEVELS, SkillLevel, selectionLabel } from "@/lib/cards";
import { GameSession, GameConfig, createGame, addScore, adjustScore, sideOut, undoLast, lastActionLabel, resetScore, startNewGame, newMatch, matchWinner, seriesTally, isPaused, pauseGame, resumePlay, elapsedMs, saveGame, listSavedGames, clearSavedGame, formatTime, serverLabel, recordTimeout, recordFault, logCount } from "@/lib/game";
import { playScoreSound, playUndoSound, playCardFlipSound, playWinSound, playResetSound, triggerHaptic } from "@/lib/sounds";
import { addMatch, deckToCards, CustomDeck, listFavoriteIds, toggleFavorite, bumpStat, matchSheet, getTournament, saveTournament } from "@/lib/client-api";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { recordResult as recordTournamentResult } from "@/lib/tournament/engine";
import TournamentHome from "@/components/tournament/TournamentHome";
import { Sun, Moon, Monitor, Play, Pause, X, Bug, HelpCircle, Sparkles, Sprout, TrendingUp, Flame, Layers as LayersIcon, ClipboardCheck, Trophy, Check } from "lucide-react";
import OfficialMatchSetup, { OfficialMatchOptions } from "@/components/OfficialMatchSetup";
import OfficialControls from "@/components/OfficialControls";
import TopBar from "@/components/TopBar";
import CardDisplay from "@/components/CardDisplay";
import ScoreKeeper from "@/components/ScoreKeeper";
import CardHistory from "@/components/CardHistory";
import WinCelebration from "@/components/WinCelebration";
import PlayerNames from "@/components/PlayerNames";
import SettingsSheet from "@/components/SettingsSheet";
import AppMenu from "@/components/AppMenu";
import HistoryPanel from "@/components/HistoryPanel";
import DecksPanel from "@/components/DecksPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import FeedbackPanel from "@/components/FeedbackPanel";
import HelpPanel from "@/components/HelpPanel";
import CardBrowserPanel from "@/components/CardBrowserPanel";
import TVScore from "@/components/TVScore";
import AchievementsPanel from "@/components/AchievementsPanel";
import WelcomeTour from "@/components/WelcomeTour";
import { MODE_ICONS } from "@/components/icons";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";
import { useToast } from "@/components/Toast";

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/SathishKumarAI/pb-card-deck";

const LANDING_MODES: { key: DeckMode; label: string; desc: string }[] = [
  { key: "family", label: "Family", desc: "Clean fun for all ages" },
  { key: "party", label: "Party", desc: "Dares and laughs" },
  { key: "drill", label: "Drill", desc: "Sharpen one skill" },
  { key: "tournament", label: "Tournament", desc: "Competitive twists" },
  { key: "chaos", label: "Chaos", desc: "Nothing held back" },
];

// Skill levels shown first on the menu, for players picking by ability.
const SKILL_ORDER: { key: SkillLevel; Icon: typeof Sprout }[] = [
  { key: "beginner", Icon: Sprout },
  { key: "intermediate", Icon: TrendingUp },
  { key: "advanced", Icon: Flame },
];

const BEGINNER_INTRO_KEY = "pb-beginner-intro-seen";
const WELCOME_TOUR_KEY = "pb-welcome-tour-seen";
const GAME_HINT_KEY = "pb-game-hint-seen";
// The deck the primary "Start playing" button will use. Remembering it is what
// lets the home screen have ONE obvious action instead of eight equal ones.
const LAST_DECK_KEY = "pb-last-deck";

// Tiny seeded PRNG so the daily challenge deck is identical for everyone on a
// given day, with no backend (backlog F018).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Home() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [cardHistory, setCardHistory] = useState<Card[]>([]);
  const [game, setGame] = useState<GameSession | null>(null);
  const [savedGames, setSavedGames] = useState<GameSession[]>([]);
  const [elapsed, setElapsed] = useState("0:00");
  const [mode, setMode] = useState<string>("chaos");
  const [showBeginnerIntro, setShowBeginnerIntro] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showGameHint, setShowGameHint] = useState(false);
  const [homeTab, setHomeTab] = useState<"cards" | "track" | "event">("cards");
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [showWhy1729, setShowWhy1729] = useState(false);
  const [lastDeck, setLastDeck] = useState<string>("beginner");
  const [customCards, setCustomCards] = useState<Card[] | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light" | "auto">("dark");
  const [systemDark, setSystemDark] = useState(true);
  const darkMode = theme === "auto" ? systemDark : theme === "dark";
  const cycleTheme = () => setTheme((t) => (t === "dark" ? "light" : t === "light" ? "auto" : "dark"));
  const [showSettings, setShowSettings] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showTv, setShowTv] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [confirmTeam, setConfirmTeam] = useState<1 | 2 | null>(null);
  const savedMatchRef = useRef<string | null>(null);
  const toast = useToast();
  const introRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLDivElement>(null);

  const dismissIntro = useCallback(() => {
    try { localStorage.setItem(BEGINNER_INTRO_KEY, "1"); } catch {}
    setShowBeginnerIntro(false);
  }, []);
  useFocusTrap(introRef, showBeginnerIntro, dismissIntro);
  useScrollLock(showBeginnerIntro);
  const paused = !!game && isPaused(game) && !game.winner;
  const resumeFromPause = useCallback(() => {
    setGame((g) => (g && isPaused(g) ? resumePlay(g, Date.now()) : g));
  }, []);
  useFocusTrap(pauseRef, paused, resumeFromPause);
  useScrollLock(paused);

  useEffect(() => {
    fetch("/cards.json", { cache: "no-store" }).then((r) => r.json()).then(setAllCards);
    setFavoriteIds(listFavoriteIds());
    try {
      const saved = localStorage.getItem(LAST_DECK_KEY);
      if (saved) setLastDeck(saved);
    } catch {}
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
        if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      }
    }
  }, []);

  // Offer to resume unfinished games (don't auto-enter - let the user choose).
  // Refreshes whenever we're back on the landing screen (F085).
  useEffect(() => {
    if (!game) setSavedGames(listSavedGames());
  }, [game, allCards]);

  const resumeGame = useCallback((saved: GameSession) => {
    const m = saved.mode;
    const custom = saved.customCards ?? null;
    setMode(m);
    setCustomCards(custom);
    setCustomName(saved.customName ?? null);
    const pool = custom ?? getDeck(allCards, m);
    setDeck(shuffleArray(pool));
    // Restore the last drawn card + recent history from the saved game's own pool.
    const byId = new Map(pool.map((c) => [c.id, c] as const));
    const drawn = saved.drawnCardIds;
    setCurrentCard(drawn.length ? byId.get(drawn[drawn.length - 1]) ?? null : null);
    setCardHistory(
      drawn.slice(-3).reverse().map((id) => byId.get(id)).filter(Boolean) as Card[]
    );
    setGame(saved);
  }, [allCards]);

  const discardSaved = useCallback((id: string) => {
    clearSavedGame(id);
    setSavedGames(listSavedGames());
  }, []);

  useEffect(() => {
    if (!game) return;
    const tick = () => setElapsed(formatTime(elapsedMs(game, Date.now())));
    tick();
    if (game.pausedAt) return; // clock frozen while paused
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [game?.startTime, game?.pausedAt, game?.pausedMs]);

  useEffect(() => { if (game) saveGame(game); }, [game]);

  // Persist a finished match to local history exactly once.
  useEffect(() => {
    if (game?.winner && savedMatchRef.current !== game.id + ":" + game.gameNumber) {
      savedMatchRef.current = game.id + ":" + game.gameNumber;
      addMatch(game);
    }
  }, [game?.winner, game?.gameNumber, game?.id]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", darkMode ? "#0e0e11" : "#f4f4f6");
  }, [darkMode]);

  // Theme preference: load once, persist on change, and follow the system when
  // set to "auto" (backlog F201).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pb-theme");
      if (saved === "dark" || saved === "light" || saved === "auto") setTheme(saved);
    } catch {}
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("pb-theme", theme); } catch {}
  }, [theme]);

  // First-ever visit: show the welcome tour (what it is / how to play / how to
  // navigate). Gated by localStorage so it only appears once.
  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_TOUR_KEY)) setShowTour(true);
    } catch {}
  }, []);
  const closeTour = useCallback(() => {
    try { localStorage.setItem(WELCOME_TOUR_KEY, "1"); } catch {}
    setShowTour(false);
  }, []);
  const replayTour = useCallback(() => { setShowRules(false); setShowTour(true); }, []);

  // One-time coaching hint the first time a game screen opens (skip Beginner
  // mode, which already shows its own intro).
  useEffect(() => {
    if (!game || game.mode === "beginner") return;
    try {
      if (!localStorage.getItem(GAME_HINT_KEY)) setShowGameHint(true);
    } catch {}
  }, [game]);
  const dismissGameHint = useCallback(() => {
    try { localStorage.setItem(GAME_HINT_KEY, "1"); } catch {}
    setShowGameHint(false);
  }, []);

  // Keep the screen awake during an active game so it doesn't dim mid-match
  // on a phone propped courtside (backlog F188). Re-acquires after the tab
  // returns to the foreground; released when the game ends or unmounts.
  useEffect(() => {
    if (!game || game.winner) return;
    type WakeLockSentinelLike = { release: () => Promise<void> };
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          sentinel = await nav.wakeLock.request("screen");
          if (cancelled) { sentinel.release().catch(() => {}); sentinel = null; }
        }
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [game]);

  const basePool = useCallback(
    () => customCards ?? getDeck(allCards, mode),
    [customCards, allCards, mode]
  );

  const startGameHandler = useCallback((m: string) => {
    setCustomCards(null);
    setCustomName(null);
    setLastDeck(m);
    try { localStorage.setItem(LAST_DECK_KEY, m); } catch {}
    setDeck(shuffleArray(getDeck(allCards, m)));
    setCurrentCard(null);
    setCardHistory([]);
    setMode(m);
    setGame(createGame(m));
    // First time into Beginner, show a short how-to-play intro.
    if (m === "beginner") {
      try {
        if (!localStorage.getItem(BEGINNER_INTRO_KEY)) setShowBeginnerIntro(true);
      } catch {}
    }
  }, [allCards]);

  // Coach / umpire "Track a match": start an official game. Cards use the full
  // pool (Chaos) so they're available if the ref enabled them; behaviour is
  // driven by config.officialMode, not the deck mode.
  const startOfficialMatch = useCallback((opts: OfficialMatchOptions) => {
    setCustomCards(null);
    setCustomName(opts.eventLabel || "Official match");
    setDeck(shuffleArray(getDeck(allCards, "chaos")));
    setCurrentCard(null);
    setCardHistory([]);
    setMode("chaos");
    setGame({
      ...createGame("chaos", { team1: opts.team1, team2: opts.team2 }, {
        officialMode: true,
        gameType: opts.gameType,
        pointsToWin: opts.pointsToWin,
        bestOf: opts.bestOf,
        eventLabel: opts.eventLabel,
        cardsEnabled: opts.cardsEnabled,
        sideOutScoring: opts.sideOutScoring,
      }),
      customName: opts.eventLabel || "Official match",
    });
  }, [allCards]);

  /* A tournament match played on the scorekeeper. Team 1 is always the match's
     team A, which is what lets the result be written straight back. */
  const startTournamentMatch = useCallback((t: Tournament, m: TournamentMatch) => {
    const nameOf = (id?: string) => t.teams.find((x) => x.id === id)?.name ?? "Team";
    const label = m.label ?? (m.pool ? `Pool ${m.pool}` : `Round ${m.round}`);
    setCustomCards(null);
    setCustomName(`${t.name} · ${label}`);
    setDeck(shuffleArray(getDeck(allCards, "chaos")));
    setCurrentCard(null);
    setCardHistory([]);
    setMode("chaos");
    setGame({
      ...createGame("chaos", { team1: nameOf(m.teamA), team2: nameOf(m.teamB) }, {
        officialMode: true,
        gameType: t.teamSize === 1 ? "singles" : "doubles",
        pointsToWin: t.config.pointsToWin,
        winByTwo: t.config.winByTwo,
        bestOf: t.config.bestOf,
        eventLabel: `${t.name} - ${label}`,
        cardsEnabled: !!t.config.cardsEnabled,
        sideOutScoring: true,
      }),
      customName: `${t.name} · ${label}`,
      tournamentRef: { tournamentId: t.id, matchId: m.id },
    });
    triggerHaptic("light");
  }, [allCards]);

  /* Write a finished tournament match back to its event, exactly once. */
  useEffect(() => {
    const ref = game?.tournamentRef;
    if (!game?.winner || !ref) return;
    const stored = getTournament(ref.tournamentId);
    const match = stored?.matches.find((m) => m.id === ref.matchId);
    if (!stored || !match || match.winner) return;
    const updated = recordTournamentResult(stored, ref.matchId, game.score.team1, game.score.team2, {
      playedInApp: true,
    });
    saveTournament(updated);
    setActiveTournament((cur) => (cur?.id === updated.id ? updated : cur));
  }, [game?.winner, game?.tournamentRef, game?.score.team1, game?.score.team2]);

  // Download the current match's sheet as a .txt file (coach/umpire export).
  const downloadMatchSheet = useCallback(() => {
    if (!game) return;
    try {
      const blob = new Blob([matchSheet(game)], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (game.config.eventLabel || "match").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `pickleball-${safe}-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [game]);

  const startDaily = useCallback(() => {
    if (!allCards.length) return;
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const rnd = mulberry32(seed);
    const pool = [...allCards];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const cards = pool.slice(0, 30);
    const label = `Daily - ${now.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    setCustomCards(cards);
    setCustomName(label);
    setMode("chaos");
    setDeck(shuffleArray(cards));
    setCurrentCard(null);
    setCardHistory([]);
    const g = createGame("chaos");
    g.customName = label;
    g.customCards = cards;
    setGame(g);
    bumpStat("daily");
    triggerHaptic("light");
  }, [allCards]);

  const startCustomDeck = useCallback((d: CustomDeck) => {
    const cards = deckToCards(d);
    setCustomCards(cards);
    setCustomName(d.name);
    setMode("chaos");
    setDeck(shuffleArray(cards));
    setCurrentCard(null);
    setCardHistory([]);
    setShowDecks(false);
    const g = createGame("chaos");
    g.customName = d.name;
    g.customCards = cards;
    setGame(g);
    triggerHaptic("light");
  }, []);

  const drawCard = () => {
    if (!game) return;
    const pool = deck.length > 0 ? deck : shuffleArray(basePool());
    const available = pool.filter((c) => !game.skippedCardIds.includes(c.id));
    const drawFrom = available.length > 0 ? available : pool;
    const [next, ...rest] = drawFrom;
    setDeck(rest.length > 0 ? rest : pool.slice(1));
    setCurrentCard(next);
    setCardHistory((prev) => [next, ...prev].slice(0, 3));
    bumpStat("draws");
    if (next.rarity === "legendary") bumpStat("legendary");
    if (game.config.soundEnabled) { playCardFlipSound(); triggerHaptic("light"); }
    setGame((g) => g ? { ...g, drawnCardIds: [...g.drawnCardIds, next.id] } : g);
  };

  const handleScore = (team: 1 | 2) => {
    if (!game) return;
    if (game.config.confirmScore) { setConfirmTeam(team); return; }
    applyScore(team);
  };

  const applyScore = (team: 1 | 2) => {
    if (!game) return;
    const updated = addScore(game, team);
    setGame(updated);
    if (updated.config.soundEnabled) {
      if (updated.winner) { playWinSound(); triggerHaptic("heavy"); }
      else { playScoreSound(); triggerHaptic("light"); }
    }
    setConfirmTeam(null);
  };

  const handleModeChange = (m: string) => {
    setCustomCards(null);
    setCustomName(null);
    setMode(m);
    setDeck(shuffleArray(getDeck(allCards, m)));
    setCurrentCard(null);
    setCardHistory([]);
  };

  const handleConfigUpdate = (key: keyof GameConfig, value: boolean | number | string) => {
    if (!game) return;
    setGame({ ...game, config: { ...game.config, [key]: value } as GameConfig });
  };

  /* Undo, out loud. Taking a point back changed one small numeral and said
     nothing, which is why it read as a dead button - and taking back a side-out
     changed nothing visible at all. */
  const doUndo = useCallback(() => {
    if (!game || game.history.length === 0) return;
    const what = lastActionLabel(game, game.playerNames);
    setGame(undoLast(game));
    if (game.config.soundEnabled) playUndoSound();
    triggerHaptic("light");
    toast(what ? `Undid ${what}` : "Undid the last action");
  }, [game, toast]);

  /* Reset is now recoverable in the engine (the reset itself sits on the undo
     stack), so it no longer needs a confirmation strip rendered far below the
     button that triggered it. Act, then offer the way back. */
  const doReset = useCallback(() => {
    if (!game) return;
    setGame(resetScore(game));
    setCurrentCard(null);
    setCardHistory([]);
    if (game.config.soundEnabled) playResetSound();
    triggerHaptic("light");
    toast("Score reset", { label: "Undo", onClick: () => setGame((g) => (g ? undoLast(g) : g)) });
  }, [game, toast]);

  const cardCounts = Object.fromEntries(
    (Object.keys(DECK_MODES) as DeckMode[]).map((m) => [m, getFilteredCards(allCards, m).length])
  ) as Record<DeckMode, number>;

  const favoriteCards = favoriteIds
    .map((id) => allCards.find((c) => c.id === id) ?? customCards?.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  /* ─── Landing Page ─── */
  if (!game) {
    return (
      <>
        <div className="mesh-bg flex flex-col" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
          <span aria-hidden className="court-centre-line court-centre-line--top" />
          <span aria-hidden className="court-centre-line court-centre-line--bottom" />
          <div className="app-col app-col--wide flex flex-col flex-1 safe-x">
          {/* Header: identity on the left, the three always-available controls
              on the right. Help sits here, not in a menu - a first-timer should
              never have to go looking for it. */}
          <header className="safe-top flex items-center justify-between gap-3 pb-6">
            <span className="flex items-center gap-2.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/app-icon.svg"
                alt=""
                width={38}
                height={38}
                className="w-[38px] h-[38px] shrink-0"
                style={{ borderRadius: 11 }}
              />
              <span className="font-display text-lg font-extrabold tracking-tight truncate" style={{ color: "var(--text)" }}>
                PB Card Deck
              </span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowRules(true)}
                className="pressable hoverable mat-thin flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-sm font-semibold"
                style={{ border: "1px solid var(--mat-edge)", color: "var(--text)", borderRadius: "var(--r-chip)" }}
              >
                <HelpCircle size={16} style={{ color: "var(--accent)" }} /> Help
              </button>
              <button onClick={cycleTheme} className="pressable hoverable mat-thin p-2 rounded-full" style={{ border: "1px solid var(--mat-edge)", color: "var(--text-secondary)" }} aria-label={`Theme: ${theme}. Tap to change.`}>
                {theme === "auto" ? <Monitor size={18} /> : theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <AppMenu onOpenHistory={() => setShowHistory(true)} onOpenDecks={() => setShowDecks(true)} onOpenFavorites={() => setShowFavorites(true)} onOpenFeedback={() => setShowFeedback(true)} onOpenRules={() => setShowRules(true)} onOpenBrowser={() => setShowBrowser(true)} onOpenAchievements={() => setShowAchievements(true)} />
            </span>
          </header>

          {/* Phone: one column, app-shaped. Desktop (>=1024px): the pitch sits
              on the left and everything you can act on collects in a column on
              the right, so a wide window gets a layout rather than a stretched
              phone screen. */}
          <main
            className={
              homeTab === "event"
                ? "flex-1 pb-8 flex flex-col gap-5"
                : "flex-1 pb-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:items-start lg:pt-6"
            }
          >
          {homeTab !== "event" && (
          <div className="anim-fade-up lg:sticky lg:top-8">
            <h1 className="font-display text-[2.1rem] sm:text-[2.6rem] lg:text-[3.4rem] font-black leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
              Draw a twist card
              <br />
              between points.
            </h1>
            {/* Four points beat a paragraph here: people scan a home screen,
                they do not read it. */}
            <ul className="mt-4 flex flex-col gap-2 lg:max-w-[38ch]">
              {[
                <>
                  <strong style={{ color: "var(--text)" }}>1,729 twist cards</strong>
                  <button
                    onClick={() => setShowWhy1729(true)}
                    aria-label="Why 1,729 cards?"
                    className="pressable align-super ml-0.5 text-[10px] font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    ?
                  </button>{" "}
                  that change the next rally
                </>,
                <>A scoreboard that handles <strong style={{ color: "var(--text)" }}>serve and side-out</strong> for you</>,
                <>Run a <strong style={{ color: "var(--text)" }}>tournament</strong> for 4 people or 50</>,
                <>No account, works offline, stays on your phone</>,
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.95rem] lg:text-base leading-snug" style={{ color: "var(--text-secondary)" }}>
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {/* Desktop has the room for the three facts that answer "is this
                for me?"; on a phone they would just push the buttons down. */}
            <dl className="hidden lg:flex mt-9 gap-3">
              {[
                ["1,729", "unique cards"],
                ["10", "categories"],
                ["0", "sign-ups"],
              ].map(([n, label]) => (
                <div
                  key={label}
                  className="mat-thin flex-1 px-4 py-3"
                  style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
                >
                  <dt className="font-display tnum text-2xl font-black" style={{ color: "var(--text)" }}>{n}</dt>
                  <dd className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          )}

          <div className={homeTab === "event" ? "flex flex-col gap-5" : "flex flex-col gap-6"}>

          {/* Top-level mode toggle: casual card play vs coach/umpire match tracking.
              Switchable any time - one tap changes the whole flow below. */}
          {!activeTournament && (
          <div className="mat-thin flex items-center gap-1 p-1" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
            {([["cards", "Play", LayersIcon], ["track", "Track", ClipboardCheck], ["event", "Tournament", Trophy]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setHomeTab(key)}
                className="pressable flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
                style={homeTab === key
                  ? { background: "var(--accent)", color: "var(--accent-ink)" }
                  : { color: "var(--text-secondary)" }}
                aria-pressed={homeTab === key}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          )}

          {/* Resume in-progress games - multiple supported (F085) */}
          {savedGames.length > 0 && homeTab !== "event" && (
            <div className="flex flex-col gap-2">
              {savedGames.length > 1 && (
                <span className="eyebrow px-0.5">Resume a game ({savedGames.length})</span>
              )}
              {savedGames.map((sg) => (
                <div key={sg.id} className="anim-pop mat-thin hoverable flex items-center gap-3 p-2.5" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}>
                  <button onClick={() => resumeGame(sg)} className="pressable flex items-center gap-3 flex-1 min-w-0 text-left" style={{ borderRadius: "var(--r-ctl)" }}>
                    <span className="flex items-center justify-center w-10 h-10 shrink-0" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: "var(--r-ctl)" }}>
                      <Play size={18} fill="currentColor" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {savedGames.length > 1 ? "Resume" : "Resume last game"}
                      </span>
                      <span className="block text-xs truncate tnum" style={{ color: "var(--text-muted)" }}>
                        {sg.playerNames.team1} {sg.score.team1}-{sg.score.team2} {sg.playerNames.team2} · {sg.customName ?? selectionLabel(sg.mode)}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => discardSaved(sg.id)} className="pressable p-2 rounded-full shrink-0" style={{ color: "var(--text-muted)" }} aria-label="Discard this saved game">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {homeTab === "track" && (
            <OfficialMatchSetup onStart={(o) => { triggerHaptic("light"); startOfficialMatch(o); }} />
          )}

          {homeTab === "event" && (
            <TournamentHome
              active={activeTournament}
              onActiveChange={setActiveTournament}
              onPlayMatch={startTournamentMatch}
            />
          )}

          {homeTab === "cards" && (
          <>
          {/* The one primary action. It plays whatever deck you played last, so
              the common case - "same as yesterday" - is a single tap. */}
          <button
            onClick={() => { triggerHaptic("light"); startGameHandler(lastDeck); }}
            disabled={!allCards.length}
            className="pressable cta-accent flex items-center justify-between gap-3 px-5 py-4 text-left disabled:opacity-50"
            style={{ borderRadius: "var(--r-panel)" }}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Play size={20} fill="currentColor" className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-base font-bold leading-tight">Start playing</span>
                <span className="block text-xs opacity-75 truncate">
                  {allCards.length ? `${selectionLabel(lastDeck)} deck · ${getDeck(allCards, lastDeck).length.toLocaleString()} cards` : "Loading cards…"}
                </span>
              </span>
            </span>
          </button>

          <div className="flex flex-col gap-2.5">
            <span className="eyebrow px-0.5">Or choose a deck</span>

            {/* By level - the on-ramp for anyone unsure what to pick */}
            <div className="grid grid-cols-3 gap-2">
              {SKILL_ORDER.map(({ key, Icon }) => {
                const lvl = SKILL_LEVELS[key];
                const count = allCards.length ? getDeck(allCards, key).length : 0;
                return (
                  <button
                    key={key}
                    onClick={() => { triggerHaptic("light"); startGameHandler(key); }}
                    className="pressable hoverable mat-thin flex flex-col gap-1 p-3 text-left"
                    style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
                    aria-label={`${lvl.label} - ${lvl.description}`}
                  >
                    <Icon size={17} className="hover-pop" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>{lvl.label}</span>
                    <span className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
                      {allCards.length ? `${count.toLocaleString()} cards` : lvl.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* By theme - compact, because they are a flavour choice, not a
                difficulty one. Five fat rows here used to dominate the page. */}
            <div className="flex flex-wrap gap-1.5">
              {LANDING_MODES.map(({ key, label, desc }) => {
                const Icon = MODE_ICONS[key];
                return (
                  <button
                    key={key}
                    onClick={() => { triggerHaptic("light"); startGameHandler(key); }}
                    title={`${desc}${allCards.length ? ` · ${cardCounts[key].toLocaleString()} cards` : ""}`}
                    className="pressable hoverable mat-thin flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-sm font-medium"
                    style={{ border: "1px solid var(--mat-edge)", color: "var(--text)", borderRadius: "var(--r-chip)" }}
                  >
                    <Icon size={15} style={{ color: "var(--accent)" }} /> {label}
                  </button>
                );
              })}
            </div>

            {/* Daily challenge - same 30-card deck for everyone each day (F018) */}
            {allCards.length > 0 && (
              <button
                onClick={() => { triggerHaptic("light"); startDaily(); }}
                className="pressable hoverable mat-thin flex items-center gap-3 p-3 text-left"
                style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}
              >
                <span className="flex items-center justify-center w-9 h-9 shrink-0" style={{ background: "var(--bg-elevated)", color: "var(--accent)", borderRadius: "var(--r-ctl)" }}>
                  <Sparkles size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Daily challenge</span>
                  <span className="block text-xs" style={{ color: "var(--text-muted)" }}>30 cards, the same for everyone today</span>
                </span>
              </button>
            )}
          </div>
          </>
          )}
          </div>
          </main>

          <footer className="safe-bottom pb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            <p className="leading-relaxed">
              Free, for fun, and not for resale.{" "}
              <a
                href={`${GITHUB_URL}/issues/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--accent)" }}
              >
                <Bug size={13} /> Report a bug or ask for a feature
              </a>
            </p>
          </footer>
          </div>
        </div>

        <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
        <DecksPanel open={showDecks} onClose={() => setShowDecks(false)} onPlay={startCustomDeck} />
        <FavoritesPanel open={showFavorites} onClose={() => setShowFavorites(false)} cards={favoriteCards} onRemove={(id) => setFavoriteIds(toggleFavorite(id))} />
        <FeedbackPanel open={showFeedback} onClose={() => setShowFeedback(false)} />
        <HelpPanel open={showRules} onClose={() => setShowRules(false)} onReplayTour={replayTour} />
        <CardBrowserPanel open={showBrowser} onClose={() => setShowBrowser(false)} allCards={allCards} />
        <AchievementsPanel open={showAchievements} onClose={() => setShowAchievements(false)} />
        <WelcomeTour open={showTour} onClose={closeTour} onOpenHelp={() => { closeTour(); setShowRules(true); }} />

        {/* Why 1,729 - the question the number begs, answered where it is asked
            rather than buried in the manual. */}
        {showWhy1729 && (
          <div
            className="sheet-scrim fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowWhy1729(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Why 1,729 cards"
          >
            <div
              className="mat-thick sheet-rise w-full max-w-sm p-6"
              style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-display text-xl font-black" style={{ color: "var(--text)" }}>
                  Why exactly 1,729?
                </h2>
                <button onClick={() => setShowWhy1729(false)} aria-label="Close" className="pressable p-1.5 rounded-full shrink-0" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                1,729 is the Hardy–Ramanujan &ldquo;taxicab&rdquo; number: the smallest number that can be written as
                the sum of two cubes in two different ways.
              </p>
              <p className="tnum my-4 text-center text-base font-semibold" style={{ color: "var(--accent)" }}>
                1³ + 12³ = 9³ + 10³ = 1,729
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                The story goes that Ramanujan, visited in hospital by Hardy, who remarked his taxi number 1729 seemed
                rather dull, replied that it was quite the opposite. It made a better target for the deck than a round
                1,700.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ─── Game Screen ─── */
  return (
    <div className="mesh-bg flex flex-col" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <TopBar
        game={game}
        mode={mode}
        modeLabelOverride={customName}
        elapsed={elapsed}
        theme={theme}
        onToggleTv={() => setShowTv(true)}
        onBack={() => { setGame(null); }}
        onCycleTheme={cycleTheme}
        onModeChange={handleModeChange}
        onEditNames={() => setShowNameEditor(!showNameEditor)}
        onToggleLock={() => setGame({ ...game, config: { ...game.config, scoreLocked: !game.config.scoreLocked } })}
        onUndo={() => { doUndo(); }}
        onReset={() => doReset()}
        paused={isPaused(game)}
        onTogglePause={() => setGame(isPaused(game) ? resumePlay(game, Date.now()) : pauseGame(game, Date.now()))}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowRules(true)}
        menuSlot={<AppMenu onOpenHistory={() => setShowHistory(true)} onOpenDecks={() => setShowDecks(true)} onOpenFavorites={() => setShowFavorites(true)} onOpenFeedback={() => setShowFeedback(true)} onOpenRules={() => setShowRules(true)} onOpenBrowser={() => setShowBrowser(true)} onOpenAchievements={() => setShowAchievements(true)} />}
      />

      <div className="app-col app-col--wide flex-1 w-full p-4 flex flex-col items-center gap-4 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start lg:pt-8">
        <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-4 lg:w-full">
        {showNameEditor && (
          <PlayerNames
            names={game.playerNames}
            onSave={(names) => { setGame({ ...game, playerNames: names }); setShowNameEditor(false); }}
          />
        )}

        <ScoreKeeper game={game} onScore={handleScore} onSideOut={() => setGame(sideOut(game))} onAdjust={(team, delta) => { setGame(adjustScore(game, team, delta)); triggerHaptic("light"); }} />

        {game.config.officialMode && (
          <OfficialControls
            game={game}
            onTimeout={(team) => { setGame(recordTimeout(game, team)); triggerHaptic("light"); }}
            onFault={(team) => { setGame(recordFault(game, team)); triggerHaptic("light"); }}
            onDownload={downloadMatchSheet}
          />
        )}

        {confirmTeam && (
          <div className="anim-pop mat-regular flex items-center gap-3 p-3" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)" }}>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              +1 {confirmTeam === 1 ? game.playerNames.team1 : game.playerNames.team2}?
            </span>
            <button onClick={() => applyScore(confirmTeam)} className="pressable px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Yes</button>
            <button onClick={() => setConfirmTeam(null)} className="pressable px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>No</button>
          </div>
        )}

        {/* Screen-reader announcement for the latest draw + score (F144) */}
        <div className="sr-only" role="status" aria-live="polite">
          {currentCard ? `Drew ${currentCard.name}. ${currentCard.effect}` : ""}
          {` Score: ${game.playerNames.team1} ${game.score.team1}, ${game.playerNames.team2} ${game.score.team2}.`}
        </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-4 lg:w-full">
        {(() => { const cardsOn = !game.config.officialMode || game.config.cardsEnabled; return (<>
        {showGameHint && cardsOn && (
          <div className="anim-pop mat-regular flex items-start gap-3 p-3 max-w-sm w-full" style={{ border: "1px solid var(--accent)", borderRadius: "var(--r-panel)" }}>
            <HelpCircle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <span className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
              Tap the card to draw a twist, then tap a team&apos;s score to give them the point. Unsure what a card means? Tap the <strong style={{ color: "var(--text)" }}>?</strong> on it.
            </span>
            <button onClick={dismissGameHint} aria-label="Dismiss hint" className="pressable p-1 -m-1 rounded-full shrink-0" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {cardsOn && (
        <CardDisplay
          card={currentCard}
          onDraw={drawCard}
          commentary={game.config.commentaryMode && game.mode !== "beginner"}
          large={game.mode === "beginner"}
          deckRemaining={deck.length}
          isFavorite={currentCard ? favoriteIds.includes(currentCard.id) : false}
          onFavorite={currentCard ? () => setFavoriteIds(toggleFavorite(currentCard.id)) : undefined}
          onSkip={currentCard ? () => {
            setGame({ ...game, skippedCardIds: [...game.skippedCardIds, currentCard.id] });
            drawCard();
          } : undefined}
        />
        )}

        {cardsOn && <CardHistory history={cardHistory} />}
        </>); })()}
        </div>
      </div>

      <SettingsSheet
        config={game.config}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={handleConfigUpdate}
        onReset={() => { doReset(); setShowSettings(false); }}
        onReplayIntro={() => { setShowSettings(false); setShowBeginnerIntro(true); }}
      />

      {showTv && (
        <TVScore game={game} onScore={handleScore} onExit={() => setShowTv(false)} />
      )}

      {isPaused(game) && !game.winner && (
        <div role="dialog" aria-modal="true" aria-label="Game paused" className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
          <div ref={pauseRef} tabIndex={-1} className="mat-thick p-8 text-center max-w-sm w-full anim-pop outline-none" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}>
            <div className="flex justify-center mb-4 anim-float" style={{ color: "var(--accent)" }}>
              <Pause size={64} strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-3xl font-black mb-1" style={{ color: "var(--text)" }}>Paused</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{elapsed} elapsed · scoring is on hold</p>
            <button
              autoFocus
              data-autofocus
              onClick={() => setGame(resumePlay(game, Date.now()))}
              className="pressable w-full flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
            >
              <Play size={18} fill="currentColor" /> Resume
            </button>
          </div>
        </div>
      )}

      {game.winner && (
        <WinCelebration
          winnerName={game.winner === 1 ? game.playerNames.team1 : game.playerNames.team2}
          score={game.score}
          matchOver={matchWinner(game) !== null}
          seriesWon={seriesTally(game)}
          onNewGame={() => { setGame(startNewGame(game)); setCurrentCard(null); setCardHistory([]); setDeck(shuffleArray(basePool())); }}
          onNewMatch={() => { setGame(newMatch(game)); setCurrentCard(null); setCardHistory([]); setDeck(shuffleArray(basePool())); }}
          onEndMatch={() => { clearSavedGame(game.id); setGame(null); }}
        />
      )}

      {showBeginnerIntro && (
        <div role="dialog" aria-modal="true" aria-label="How to play" className="sheet-scrim fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div ref={introRef} tabIndex={-1} className="mat-thick p-7 max-w-sm w-full anim-pop outline-none" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}>
            <div className="flex justify-center mb-3" style={{ color: "var(--accent)" }}>
              <Sprout size={48} strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-black text-center mb-1" style={{ color: "var(--text)" }}>Welcome - here&apos;s how to play</h2>
            <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>Beginner mode keeps it simple.</p>
            <ol className="flex flex-col gap-3 mb-6">
              {[
                "Tap the card to draw a twist - a simple rule for the next point.",
                "Play that point under the rule. Read the tip if you're unsure.",
                "Tap a team's score to give them the point. First to 11 (win by 2) wins.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: "var(--text)" }}>{step}</span>
                </li>
              ))}
            </ol>
            <button
              autoFocus
              data-autofocus
              onClick={dismissIntro}
              className="pressable w-full px-6 py-3 font-bold rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "var(--elev-2)" }}
            >
              Got it - let&apos;s play
            </button>
          </div>
        </div>
      )}

      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
      <DecksPanel open={showDecks} onClose={() => setShowDecks(false)} onPlay={startCustomDeck} />
      <FavoritesPanel open={showFavorites} onClose={() => setShowFavorites(false)} cards={favoriteCards} onRemove={(id) => setFavoriteIds(toggleFavorite(id))} />
      <FeedbackPanel open={showFeedback} onClose={() => setShowFeedback(false)} />
      <HelpPanel open={showRules} onClose={() => setShowRules(false)} onReplayTour={replayTour} />
        <CardBrowserPanel open={showBrowser} onClose={() => setShowBrowser(false)} allCards={allCards} />
        <AchievementsPanel open={showAchievements} onClose={() => setShowAchievements(false)} />
        <WelcomeTour open={showTour} onClose={closeTour} onOpenHelp={() => { closeTour(); setShowRules(true); }} />
    </div>
  );
}
