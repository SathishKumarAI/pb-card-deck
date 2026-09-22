"use client";

/**
 * The app's one stateful screen. It owns the SESSION - the card pool, the
 * drawn card, the live game, what is saved on the device - and hands it to
 * whichever screen is showing.
 *
 * It owns no layout. `components/HomeScreen.tsx` is the landing screen and
 * `components/GameScreen.tsx` is the game; the sheets live in
 * `components/AppPanels.tsx`. Put markup in those, not here.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, DeckMode, DECK_MODES, getFilteredCards, getDeck, shuffleArray } from "@/lib/cards";
import {
  GameSession, GameConfig, createGame, undoLast, lastActionLabel, resetScore,
  startNewGame, newMatch, elapsedMs, saveGame, listSavedGames,
  clearSavedGame, formatTime,
} from "@/lib/game";
import { playUndoSound, playCardFlipSound, playResetSound, triggerHaptic } from "@/lib/sounds";
import { addMatch, deckToCards, CustomDeck, listFavoriteIds, toggleFavorite, bumpStat, matchSheet, getTournament, saveTournament } from "@/lib/client-api";
import { getSavePref, setSavePref, shouldAskToSave } from "@/lib/historyConsent";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { recordResult as recordTournamentResult } from "@/lib/tournament/engine";
import { OfficialMatchOptions } from "@/components/OfficialMatchSetup";
import AppMenu from "@/components/AppMenu";
import AppPanels from "@/components/AppPanels";
import BeginnerIntro from "@/components/BeginnerIntro";
import GameScreen from "@/components/GameScreen";
import HomeScreen, { HomeTab } from "@/components/HomeScreen";
import SaveMatchPrompt from "@/components/SaveMatchPrompt";
import { useOnce } from "@/lib/useOnce";
import { usePanels } from "@/lib/usePanels";
import { useTheme } from "@/lib/useTheme";
import { useToast } from "@/components/Toast";

const BEGINNER_INTRO_KEY = "pb-beginner-intro-seen";
const WELCOME_TOUR_KEY = "pb-welcome-tour-seen";
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
  const [homeTab, setHomeTab] = useState<HomeTab>("cards");
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [lastDeck, setLastDeck] = useState<string>("beginner");
  const [customCards, setCustomCards] = useState<Card[] | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  /* A finished match waiting on the user's answer before it is written. */
  const [pendingSave, setPendingSave] = useState<GameSession | null>(null);
  const [beginnerStarted, setBeginnerStarted] = useState(false);

  const { theme, cycleTheme } = useTheme();
  const panels = usePanels();
  const tour = useOnce(WELCOME_TOUR_KEY);
  const intro = useOnce(BEGINNER_INTRO_KEY, beginnerStarted);
  const toast = useToast();
  const handledMatchRef = useRef<string | null>(null);
  /* The save answer already given for THIS match (session id), so a best of 3
     asks once instead of once per game. Cleared when a new match starts. */
  const matchAnswerRef = useRef<{ id: string; save: boolean } | null>(null);

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

  useEffect(() => {
    if (!game) return;
    const tick = () => setElapsed(formatTime(elapsedMs(game, Date.now())));
    tick();
    if (game.pausedAt) return; // clock frozen while paused
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [game?.startTime, game?.pausedAt, game?.pausedMs]);

  useEffect(() => { if (game) saveGame(game); }, [game]);

  /* A finished game reaches the device's history exactly once, and only with
     permission. The answer covers the whole match: a best of 3 finishes three
     games, and three dialogs for one match is nobody's idea of consent. */
  useEffect(() => {
    if (!game?.winner) return;
    const key = game.id + ":" + game.gameNumber;
    if (handledMatchRef.current === key) return;
    handledMatchRef.current = key;
    const answered = matchAnswerRef.current?.id === game.id
      ? matchAnswerRef.current.save
      : undefined;
    const { ask, save } = shouldAskToSave(getSavePref(), answered);
    if (ask) setPendingSave(game);
    else if (save) addMatch(game);
  }, [game?.winner, game?.gameNumber, game?.id]);

  const answerSave = useCallback((save: boolean, remember: boolean) => {
    const g = pendingSave;
    setPendingSave(null);
    if (remember) setSavePref(save ? "always" : "never");
    if (!g) return;
    matchAnswerRef.current = { id: g.id, save };
    if (save) { addMatch(g); toast("Match saved to this device"); }
    else toast("Match not saved");
  }, [pendingSave, toast]);

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

  const startGameHandler = useCallback((m: string) => {
    triggerHaptic("light");
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
    setBeginnerStarted(m === "beginner");
  }, [allCards]);

  // Coach / umpire "Track a match": start an official game. Cards use the full
  // pool (Chaos) so they're available if the ref enabled them; behaviour is
  // driven by config.officialMode, not the deck mode.
  const startOfficialMatch = useCallback((opts: OfficialMatchOptions) => {
    triggerHaptic("light");
    setCustomCards(null);
    setCustomName(opts.eventLabel || "Official match");
    setDeck(shuffleArray(getDeck(allCards, "chaos")));
    setCurrentCard(null);
    setCardHistory([]);
    setMode("chaos");
    setBeginnerStarted(false);
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
    setBeginnerStarted(false);
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
    setBeginnerStarted(false);
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
    setBeginnerStarted(false);
    setDeck(shuffleArray(cards));
    setCurrentCard(null);
    setCardHistory([]);
    panels.close("decks");
    const g = createGame("chaos");
    g.customName = d.name;
    g.customCards = cards;
    setGame(g);
    triggerHaptic("light");
  }, [panels]);

  const basePool = useCallback(
    () => customCards ?? getDeck(allCards, mode),
    [customCards, allCards, mode]
  );

  const drawCard = useCallback(() => {
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
  }, [game, deck, basePool]);

  const handleModeChange = useCallback((m: string) => {
    setCustomCards(null);
    setCustomName(null);
    setMode(m);
    setDeck(shuffleArray(getDeck(allCards, m)));
    setCurrentCard(null);
    setCardHistory([]);
  }, [allCards]);

  const handleConfigUpdate = useCallback((key: keyof GameConfig, value: boolean | number | string) => {
    setGame((g) => (g ? { ...g, config: { ...g.config, [key]: value } as GameConfig } : g));
  }, []);

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

  /* Reset is recoverable in the engine (the reset itself sits on the undo
     stack), so it does not need a confirmation strip rendered far below the
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

  const cardCounts = Object.fromEntries(
    (Object.keys(DECK_MODES) as DeckMode[]).map((m) => [m, getFilteredCards(allCards, m).length])
  ) as Record<DeckMode, number>;

  const favoriteCards = favoriteIds
    .map((id) => allCards.find((c) => c.id === id) ?? customCards?.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  const menuSlot = (
    <AppMenu
      onOpenHistory={() => panels.show("history")}
      onOpenDecks={() => panels.show("decks")}
      onOpenFavorites={() => panels.show("favorites")}
      onOpenFeedback={() => panels.show("feedback")}
      onOpenRules={() => panels.show("rules")}
      onOpenBrowser={() => panels.show("browser")}
      onOpenAchievements={() => panels.show("achievements")}
    />
  );

  const sheets = (
    <>
      <AppPanels
        open={panels.open}
        onClose={panels.close}
        allCards={allCards}
        favoriteCards={favoriteCards}
        onPlayDeck={startCustomDeck}
        onRemoveFavorite={(id) => setFavoriteIds(toggleFavorite(id))}
        tourOpen={tour.show}
        onCloseTour={tour.dismiss}
        onReplayTour={() => { panels.close("rules"); tour.replay(); }}
        onTourHelp={() => { tour.dismiss(); panels.show("rules"); }}
      />
      {intro.show && <BeginnerIntro onDismiss={intro.dismiss} />}
      {pendingSave && <SaveMatchPrompt game={pendingSave} onAnswer={answerSave} />}
    </>
  );

  if (!game) {
    return (
      <>
        <HomeScreen
          allCards={allCards}
          cardCounts={cardCounts}
          lastDeck={lastDeck}
          savedGames={savedGames}
          tab={homeTab}
          onTabChange={setHomeTab}
          activeTournament={activeTournament}
          onActiveTournamentChange={setActiveTournament}
          theme={theme}
          onCycleTheme={cycleTheme}
          onStartDeck={startGameHandler}
          onStartDaily={startDaily}
          onStartOfficial={startOfficialMatch}
          onPlayTournamentMatch={startTournamentMatch}
          onResumeGame={resumeGame}
          onDiscardSaved={discardSaved}
          onOpenHelp={() => panels.show("rules")}
          menuSlot={menuSlot}
        />
        {sheets}
      </>
    );
  }

  return (
    <>
      <GameScreen
        game={game}
        onGameChange={setGame}
        mode={mode}
        customName={customName}
        elapsed={elapsed}
        theme={theme}
        onCycleTheme={cycleTheme}
        currentCard={currentCard}
        cardHistory={cardHistory}
        deckRemaining={deck.length}
        favoriteIds={favoriteIds}
        onToggleFavorite={(id) => setFavoriteIds(toggleFavorite(id))}
        onDraw={drawCard}
        onBack={() => setGame(null)}
        onModeChange={handleModeChange}
        onUndo={doUndo}
        onReset={doReset}
        onConfigUpdate={handleConfigUpdate}
        onDownloadSheet={downloadMatchSheet}
        onNewGame={() => {
          setGame(startNewGame(game));
          setCurrentCard(null);
          setCardHistory([]);
          setDeck(shuffleArray(basePool()));
        }}
        onNewMatch={() => {
          setGame(newMatch(game));
          setCurrentCard(null);
          setCardHistory([]);
          setDeck(shuffleArray(basePool()));
        }}
        onEndMatch={() => { clearSavedGame(game.id); setGame(null); }}
        onOpenHelp={() => panels.show("rules")}
        onReplayIntro={intro.replay}
        menuSlot={menuSlot}
      />
      {sheets}
    </>
  );
}
