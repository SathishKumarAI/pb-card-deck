"use client";

import { GameSession } from "@/lib/game";
import { DeckMode, DECK_MODES, SKILL_LEVELS, SkillLevel, isSkillLevel, selectionLabel } from "@/lib/cards";
import { MODE_ICONS } from "./icons";
import { ArrowLeft, Settings, Sun, Moon, Monitor, Undo2, Lock, LockOpen, Pencil, ChevronDown, RotateCcw, Pause, Play, Sprout, TrendingUp, Flame, Shuffle, Tv, HelpCircle } from "lucide-react";
import { useState } from "react";

const SKILL_ICONS: Record<SkillLevel, typeof Sprout> = {
  beginner: Sprout,
  intermediate: TrendingUp,
  advanced: Flame,
};

/** A round icon-only control in row 1. */
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="pressable hover-tint flex items-center justify-center w-10 h-10 rounded-full"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}

/** A segment of the match strip. Divider on the left of every one but the first. */
function StripButton({
  label, onClick, disabled, pressed, tone, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className="flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 text-xs font-medium transition-colors disabled:opacity-30 active:bg-[var(--bg-card)]"
      style={{ color: tone ?? "var(--text-secondary)", borderLeft: "1px solid var(--border)" }}
    >
      {children}
    </button>
  );
}

export default function TopBar({
  game,
  mode,
  modeLabelOverride,
  elapsed,
  theme,
  onBack,
  onCycleTheme,
  onToggleTv,
  onModeChange,
  onEditNames,
  onToggleLock,
  onUndo,
  onReset,
  paused,
  onTogglePause,
  onOpenSettings,
  onOpenHelp,
  menuSlot,
}: {
  game: GameSession;
  mode: string;
  modeLabelOverride?: string | null;
  elapsed: string;
  theme: "dark" | "light" | "auto";
  onBack: () => void;
  onCycleTheme: () => void;
  onToggleTv: () => void;
  onModeChange: (m: string) => void;
  onEditNames: () => void;
  onToggleLock: () => void;
  onUndo: () => void;
  onReset: () => void;
  paused: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  menuSlot?: React.ReactNode;
}) {
  const [showModes, setShowModes] = useState(false);
  const ModeIcon = isSkillLevel(mode) ? SKILL_ICONS[mode] : (MODE_ICONS[mode as DeckMode] ?? Shuffle);

  return (
    <div className="w-full sticky top-0 z-30 mat-regular" style={{ borderBottom: "1px solid var(--mat-edge)", paddingTop: "env(safe-area-inset-top)" }}>
      {/* Row 1 - where am I, and how do I leave. Nothing that changes the score. */}
      <div className="app-col app-col--wide flex items-center justify-between gap-2 px-4 py-2.5">
        <button onClick={onBack} aria-label="Back to home" className="pressable shrink-0 flex items-center gap-1 pr-2 py-2.5 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={17} /> Back
        </button>

        <button onClick={() => setShowModes(!showModes)} aria-haspopup="true" aria-expanded={showModes} aria-label="Change deck" className="pressable hoverable min-w-0 flex items-center gap-1.5 px-3 py-1.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-chip)" }}>
          <ModeIcon size={14} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {modeLabelOverride || selectionLabel(mode)}
          </span>
          <ChevronDown size={13} style={{ color: "var(--text-muted)", transform: showModes ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton label="Help" onClick={onOpenHelp}><HelpCircle size={18} /></IconButton>
          <IconButton label="Big-score display" onClick={onToggleTv}><Tv size={18} /></IconButton>
          <IconButton label="Settings" onClick={onOpenSettings}><Settings size={18} /></IconButton>
          <IconButton label={`Theme: ${theme}. Tap to change.`} onClick={onCycleTheme}>
            {theme === "auto" ? <Monitor size={18} /> : theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </IconButton>
          {menuSlot}
        </div>
      </div>

      {/* Row 2 - the match strip: where the game is, and the controls that change
          it. One surface with hairline dividers, so it reads as a single
          instrument rather than six floating words. */}
      <div className="app-col app-col--wide px-4 pb-2.5">
        <div className="flex items-stretch overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl)" }}>
          <span className="tnum flex items-center gap-1.5 px-3 text-xs font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>G{game.gameNumber}</span>
            {elapsed}
          </span>
          <StripButton label={paused ? "Resume game" : "Pause game"} pressed={paused} onClick={onTogglePause} tone={paused ? "var(--accent)" : undefined}>
            {paused ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
            <span className="hidden min-[360px]:inline">{paused ? "Resume" : "Pause"}</span>
          </StripButton>
          <StripButton label="Undo the last action" onClick={onUndo} disabled={game.history.length === 0}>
            <Undo2 size={14} />
            <span className="hidden min-[360px]:inline">Undo</span>
          </StripButton>
          <StripButton label="Reset the score" onClick={onReset} disabled={game.score.team1 === 0 && game.score.team2 === 0}>
            <RotateCcw size={14} />
            <span className="hidden min-[360px]:inline">Reset</span>
          </StripButton>
          <StripButton
            label={game.config.scoreLocked ? "Unlock the score" : "Lock the score against stray taps"}
            pressed={game.config.scoreLocked}
            onClick={onToggleLock}
            tone={game.config.scoreLocked ? "var(--red)" : undefined}
          >
            {game.config.scoreLocked ? <Lock size={14} /> : <LockOpen size={14} />}
          </StripButton>
          <StripButton label="Edit team names" onClick={onEditNames}>
            <Pencil size={14} />
          </StripButton>
        </div>
      </div>

      {/* Mode selector dropdown */}
      {showModes && (
        <div className="app-col app-col--wide px-4 pb-3 anim-fade-up">
          <div className="flex flex-wrap gap-1.5 justify-center mb-1.5">
            {(Object.keys(SKILL_LEVELS) as SkillLevel[]).map((m) => {
              const Icon = SKILL_ICONS[m];
              const active = mode === m && !modeLabelOverride;
              return (
                <button
                  key={m}
                  onClick={() => { onModeChange(m); setShowModes(false); }}
                  className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-elevated)",
                    color: active ? "var(--accent-ink)" : "var(--text-secondary)",
                    
                  }}
                >
                  <Icon size={13} /> {SKILL_LEVELS[m].label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {(Object.keys(DECK_MODES) as DeckMode[]).map((m) => {
              const Icon = MODE_ICONS[m];
              const active = mode === m && !modeLabelOverride;
              return (
                <button
                  key={m}
                  onClick={() => { onModeChange(m); setShowModes(false); }}
                  className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-elevated)",
                    color: active ? "var(--accent-ink)" : "var(--text-secondary)",
                    
                  }}
                >
                  <Icon size={13} /> {DECK_MODES[m].label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
