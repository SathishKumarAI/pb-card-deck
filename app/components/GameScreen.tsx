"use client";

/**
 * The game screen: top bar, scoreboard, the card, and the overlays that belong
 * to a live game (settings, TV score, pause, win).
 *
 * Owns only its own UI state - which sheet is open, whether the score needs
 * confirming. The session itself lives in `page.tsx`.
 */

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Card } from "@/lib/cards";
import {
  GameConfig, GameSession, adjustScore, addScore, isPaused, matchWinner,
  pauseGame, recordFault, recordTimeout, resumePlay, seriesTally, sideOut,
} from "@/lib/game";
import { playScoreSound, playWinSound, triggerHaptic } from "@/lib/sounds";
import type { Theme } from "@/lib/useTheme";
import { useOnce } from "@/lib/useOnce";
import { useWakeLock } from "@/lib/useWakeLock";
import TopBar from "@/components/TopBar";
import ScoreKeeper from "@/components/ScoreKeeper";
import OfficialControls from "@/components/OfficialControls";
import CardDisplay from "@/components/CardDisplay";
import CardHistory from "@/components/CardHistory";
import PlayerNames from "@/components/PlayerNames";
import SettingsSheet from "@/components/SettingsSheet";
import TVScore from "@/components/TVScore";
import WinCelebration from "@/components/WinCelebration";
import PauseOverlay from "@/components/PauseOverlay";

const GAME_HINT_KEY = "pb-game-hint-seen";

export interface GameScreenProps {
  game: GameSession;
  onGameChange: (g: GameSession) => void;
  mode: string;
  customName: string | null;
  elapsed: string;
  theme: Theme;
  onCycleTheme: () => void;
  currentCard: Card | null;
  cardHistory: Card[];
  deckRemaining: number;
  favoriteIds: number[];
  onToggleFavorite: (id: number) => void;
  onDraw: () => void;
  onBack: () => void;
  onModeChange: (m: string) => void;
  onUndo: () => void;
  onReset: () => void;
  onConfigUpdate: (key: keyof GameConfig, value: boolean | number | string) => void;
  onDownloadSheet: () => void;
  onNewGame: () => void;
  onNewMatch: () => void;
  onEndMatch: () => void;
  onOpenHelp: () => void;
  onReplayIntro: () => void;
  menuSlot: React.ReactNode;
}

export default function GameScreen({
  game, onGameChange, mode, customName, elapsed, theme, onCycleTheme,
  currentCard, cardHistory, deckRemaining, favoriteIds, onToggleFavorite,
  onDraw, onBack, onModeChange, onUndo, onReset, onConfigUpdate,
  onDownloadSheet, onNewGame, onNewMatch, onEndMatch, onOpenHelp,
  onReplayIntro, menuSlot,
}: GameScreenProps) {
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTv, setShowTv] = useState(false);
  const [confirmTeam, setConfirmTeam] = useState<1 | 2 | null>(null);

  const paused = isPaused(game);
  useWakeLock(!game.winner);

  /* One-time coaching hint, skipped in Beginner mode which has its own intro. */
  const hint = useOnce(GAME_HINT_KEY, game.mode !== "beginner");

  const applyScore = (team: 1 | 2) => {
    const updated = addScore(game, team);
    onGameChange(updated);
    if (updated.config.soundEnabled) {
      if (updated.winner) { playWinSound(); triggerHaptic("heavy"); }
      else { playScoreSound(); triggerHaptic("light"); }
    }
    setConfirmTeam(null);
  };

  const handleScore = (team: 1 | 2) => {
    if (game.config.confirmScore) { setConfirmTeam(team); return; }
    applyScore(team);
  };

  const cardsOn = !game.config.officialMode || game.config.cardsEnabled;

  return (
    <div className="mesh-bg flex flex-col" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <TopBar
        game={game}
        mode={mode}
        modeLabelOverride={customName}
        elapsed={elapsed}
        theme={theme}
        onToggleTv={() => setShowTv(true)}
        onBack={onBack}
        onCycleTheme={onCycleTheme}
        onModeChange={onModeChange}
        onEditNames={() => setShowNameEditor(!showNameEditor)}
        onToggleLock={() => onConfigUpdate("scoreLocked", !game.config.scoreLocked)}
        onUndo={onUndo}
        onReset={onReset}
        paused={paused}
        onTogglePause={() => onGameChange(paused ? resumePlay(game, Date.now()) : pauseGame(game, Date.now()))}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={onOpenHelp}
        menuSlot={menuSlot}
      />

      <div className="app-col app-col--wide flex-1 w-full p-4 flex flex-col items-center gap-4 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start lg:content-center lg:pt-8">
        <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-4 lg:w-full">
          {showNameEditor && (
            <PlayerNames
              names={game.playerNames}
              onSave={(names) => { onGameChange({ ...game, playerNames: names }); setShowNameEditor(false); }}
            />
          )}

          <ScoreKeeper
            game={game}
            onScore={handleScore}
            onSideOut={() => onGameChange(sideOut(game))}
            onAdjust={(team, delta) => { onGameChange(adjustScore(game, team, delta)); triggerHaptic("light"); }}
          />

          {game.config.officialMode && (
            <OfficialControls
              game={game}
              onTimeout={(team) => { onGameChange(recordTimeout(game, team)); triggerHaptic("light"); }}
              onFault={(team) => { onGameChange(recordFault(game, team)); triggerHaptic("light"); }}
              onDownload={onDownloadSheet}
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
          {hint.show && cardsOn && (
            <div className="anim-pop mat-regular flex items-start gap-3 p-3 max-w-sm w-full" style={{ border: "1px solid var(--accent)", borderRadius: "var(--r-panel)" }}>
              <HelpCircle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
                Tap the card to draw a twist, then tap a team&apos;s score to give them the point. Unsure what a card means? Tap the <strong style={{ color: "var(--text)" }}>?</strong> on it.
              </span>
              <button onClick={hint.dismiss} aria-label="Dismiss hint" className="pressable p-1 -m-1 rounded-full shrink-0" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          )}

          {cardsOn && (
            <CardDisplay
              card={currentCard}
              onDraw={onDraw}
              commentary={game.config.commentaryMode && game.mode !== "beginner"}
              large={game.mode === "beginner"}
              deckRemaining={deckRemaining}
              isFavorite={currentCard ? favoriteIds.includes(currentCard.id) : false}
              onFavorite={currentCard ? () => onToggleFavorite(currentCard.id) : undefined}
              onSkip={currentCard ? () => {
                onGameChange({ ...game, skippedCardIds: [...game.skippedCardIds, currentCard.id] });
                onDraw();
              } : undefined}
            />
          )}

          {cardsOn && <CardHistory history={cardHistory} />}
        </div>
      </div>

      <SettingsSheet
        config={game.config}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={onConfigUpdate}
        onReset={() => { onReset(); setShowSettings(false); }}
        onReplayIntro={() => { setShowSettings(false); onReplayIntro(); }}
      />

      {showTv && <TVScore game={game} onScore={handleScore} onExit={() => setShowTv(false)} />}

      {paused && !game.winner && (
        <PauseOverlay elapsed={elapsed} onResume={() => onGameChange(resumePlay(game, Date.now()))} />
      )}

      {game.winner && (
        <WinCelebration
          winnerName={game.winner === 1 ? game.playerNames.team1 : game.playerNames.team2}
          score={game.score}
          matchOver={matchWinner(game) !== null}
          seriesWon={seriesTally(game)}
          onNewGame={onNewGame}
          onNewMatch={onNewMatch}
          onEndMatch={onEndMatch}
        />
      )}
    </div>
  );
}
