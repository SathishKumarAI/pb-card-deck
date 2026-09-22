"use client";

/**
 * The landing screen: the pitch, the Play / Track / Tournament switch, resume
 * rows, and every way to start something.
 *
 * Owns no game state - it takes what to show and calls back to start things.
 * `page.tsx` owns the session; this file owns how the home screen looks.
 */

import { useState } from "react";
import { Bug, Check, ClipboardCheck, HelpCircle, Layers as LayersIcon, Monitor, Moon, Play, Sparkles, Sprout, Sun, TrendingUp, Flame, Trophy, X } from "lucide-react";
import { Card, DeckMode, getDeck, SKILL_LEVELS, SkillLevel, selectionLabel } from "@/lib/cards";
import { GameSession } from "@/lib/game";
import type { Tournament, TournamentMatch } from "@/lib/tournament/types";
import type { Theme } from "@/lib/useTheme";
import OfficialMatchSetup, { OfficialMatchOptions } from "@/components/OfficialMatchSetup";
import TournamentHome from "@/components/tournament/TournamentHome";
import Why1729 from "@/components/Why1729";
import { MODE_ICONS } from "@/components/icons";

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/SathishKumarAI/pb-card-deck";

/* Decks by flavour. The chips are deliberately small - this is a mood choice,
   not a difficulty one, and five fat rows used to dominate the page. */
const LANDING_MODES: { key: DeckMode; label: string; desc: string }[] = [
  { key: "family", label: "Family", desc: "Clean fun for all ages" },
  { key: "party", label: "Party", desc: "Dares and laughs" },
  { key: "drill", label: "Drill", desc: "Sharpen one skill" },
  { key: "tournament", label: "Tournament", desc: "Competitive twists" },
  { key: "chaos", label: "Chaos", desc: "Nothing held back" },
];

/* Skill levels come first, for players picking by ability. */
const SKILL_ORDER: { key: SkillLevel; Icon: typeof Sprout }[] = [
  { key: "beginner", Icon: Sprout },
  { key: "intermediate", Icon: TrendingUp },
  { key: "advanced", Icon: Flame },
];

export type HomeTab = "cards" | "track" | "event";

export interface HomeScreenProps {
  allCards: Card[];
  cardCounts: Record<DeckMode, number>;
  lastDeck: string;
  savedGames: GameSession[];
  tab: HomeTab;
  onTabChange: (t: HomeTab) => void;
  activeTournament: Tournament | null;
  onActiveTournamentChange: (t: Tournament | null) => void;
  theme: Theme;
  onCycleTheme: () => void;
  onStartDeck: (mode: string) => void;
  onStartDaily: () => void;
  onStartOfficial: (o: OfficialMatchOptions) => void;
  onPlayTournamentMatch: (t: Tournament, m: TournamentMatch) => void;
  onResumeGame: (g: GameSession) => void;
  onDiscardSaved: (id: string) => void;
  onOpenHelp: () => void;
  menuSlot: React.ReactNode;
}

export default function HomeScreen({
  allCards, cardCounts, lastDeck, savedGames, tab, onTabChange,
  activeTournament, onActiveTournamentChange, theme, onCycleTheme,
  onStartDeck, onStartDaily, onStartOfficial, onPlayTournamentMatch,
  onResumeGame, onDiscardSaved, onOpenHelp, menuSlot,
}: HomeScreenProps) {
  const [showWhy1729, setShowWhy1729] = useState(false);
  const ThemeIcon = theme === "auto" ? Monitor : theme === "dark" ? Moon : Sun;

  return (
    <>
      <div className="mesh-bg flex flex-col" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
        <span aria-hidden className="court-centre-line court-centre-line--top" />
        <span aria-hidden className="court-centre-line court-centre-line--bottom" />
        {/* One width at every tab. A per-tab width made the page jump sideways. */}
        <div className="app-col app-col--wide flex flex-col flex-1 safe-x">

        {/* Identity left, the three always-available controls right. Help sits
            here, not in a menu - a first-timer should never go looking for it. */}
        <header className="safe-top flex items-center justify-between gap-3 pb-6">
          <span className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/app-icon.svg" alt="" width={38} height={38} className="w-[38px] h-[38px] shrink-0" style={{ borderRadius: 11 }} />
            <span className="font-display text-lg font-extrabold tracking-tight truncate" style={{ color: "var(--text)" }}>
              PB Card Deck
            </span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenHelp}
              className="pressable hoverable mat-thin flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-sm font-semibold"
              style={{ border: "1px solid var(--mat-edge)", color: "var(--text)", borderRadius: "var(--r-chip)" }}
            >
              <HelpCircle size={16} style={{ color: "var(--accent)" }} /> Help
            </button>
            <button onClick={onCycleTheme} className="pressable hoverable mat-thin p-2 rounded-full" style={{ border: "1px solid var(--mat-edge)", color: "var(--text-secondary)" }} aria-label={`Theme: ${theme}. Tap to change.`}>
              <ThemeIcon size={18} />
            </button>
            {menuSlot}
          </span>
        </header>

        {/* Phone: one column, app-shaped. Desktop (>=1024px): the pitch sits on
            the left and everything you can act on collects on the right, so a
            wide window gets a layout rather than a stretched phone screen. */}
        <main
          className={
            tab === "event"
              ? "flex-1 pb-8 flex flex-col gap-5"
              : "flex-1 pb-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:items-start lg:content-center lg:pt-6"
          }
        >
          {tab !== "event" && (
            <div className="anim-fade-up lg:sticky lg:top-8">
              <h1 className="font-display text-[2.1rem] sm:text-[2.6rem] lg:text-[3.4rem] font-black leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
                Draw a twist card
                <br />
                between points.
              </h1>
              {/* Four points beat a paragraph: people scan a home screen. */}
              <ul className="mt-4 flex flex-col gap-2 lg:max-w-[38ch]">
                {[
                  <>
                    <strong style={{ color: "var(--text)" }}>1,729 twist cards</strong>
                    <button
                      onClick={() => setShowWhy1729(true)}
                      aria-label="Why 1,729 cards?"
                      className="pressable align-super relative ml-0.5 text-[10px] font-bold before:absolute before:-inset-[11px] before:content-['']"
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
                  for me?"; on a phone they would push the buttons down. */}
              <dl className="hidden lg:flex mt-9 gap-3">
                {[["1,729", "unique cards"], ["10", "categories"], ["0", "sign-ups"]].map(([n, label]) => (
                  <div key={label} className="mat-thin flex-1 px-4 py-3" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}>
                    <dt className="font-display tnum text-2xl font-black" style={{ color: "var(--text)" }}>{n}</dt>
                    <dd className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className={tab === "event" ? "flex flex-col gap-5" : "flex flex-col gap-6"}>

            {/* Casual card play vs coach/umpire tracking vs an event. One tap
                changes the whole flow below. */}
            {!activeTournament && (
              <div className="mat-thin flex items-center gap-1 p-1" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
                {([["cards", "Play", LayersIcon], ["track", "Track", ClipboardCheck], ["event", "Tournament", Trophy]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => onTabChange(key)}
                    className="pressable flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
                    style={tab === key
                      ? { background: "var(--accent)", color: "var(--accent-ink)" }
                      : { color: "var(--text-secondary)" }}
                    aria-pressed={tab === key}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            )}

            {/* Resume in-progress games - multiple supported (F085) */}
            {savedGames.length > 0 && tab !== "event" && (
              <div className="flex flex-col gap-2">
                {savedGames.length > 1 && (
                  <span className="eyebrow px-0.5">Resume a game ({savedGames.length})</span>
                )}
                {savedGames.map((sg) => (
                  <div key={sg.id} className="anim-pop mat-thin hoverable flex items-center gap-3 p-2.5" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-panel)" }}>
                    <button onClick={() => onResumeGame(sg)} className="pressable flex items-center gap-3 flex-1 min-w-0 text-left" style={{ borderRadius: "var(--r-ctl)" }}>
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
                    <button onClick={() => onDiscardSaved(sg.id)} className="pressable p-2 rounded-full shrink-0" style={{ color: "var(--text-muted)" }} aria-label="Discard this saved game">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "track" && <OfficialMatchSetup onStart={onStartOfficial} />}

            {tab === "event" && (
              <TournamentHome
                active={activeTournament}
                onActiveChange={onActiveTournamentChange}
                onPlayMatch={onPlayTournamentMatch}
              />
            )}

            {tab === "cards" && (
              <>
                {/* The one primary action. It plays whatever deck you played
                    last, so "same as yesterday" is a single tap. */}
                <button
                  onClick={() => onStartDeck(lastDeck)}
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
                          onClick={() => onStartDeck(key)}
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

                  {/* By theme. Desktop puts all five on ONE row: a five-column
                      grid with the icon above the label, because laid out
                      horizontally "Tournament" alone pushes the row past the
                      27rem column and wraps. Phones keep the wrap. */}
                  <div className="flex flex-wrap gap-1.5 lg:grid lg:grid-cols-5">
                    {LANDING_MODES.map(({ key, label, desc }) => {
                      const Icon = MODE_ICONS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => onStartDeck(key)}
                          title={`${desc}${allCards.length ? ` · ${cardCounts[key].toLocaleString()} cards` : ""}`}
                          className="pressable hoverable mat-thin flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-sm font-medium lg:flex-col lg:gap-1 lg:px-1 lg:py-2.5 lg:justify-center lg:text-center lg:text-xs"
                          style={{ border: "1px solid var(--mat-edge)", color: "var(--text)", borderRadius: "var(--r-chip)" }}
                        >
                          <Icon size={15} className="shrink-0" style={{ color: "var(--accent)" }} />
                          <span className="lg:leading-none">{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Daily challenge - same 30-card deck for everyone (F018) */}
                  {allCards.length > 0 && (
                    <button
                      onClick={onStartDaily}
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
              className="inline-flex items-center gap-1 py-2.5 -my-1.5 font-medium underline-offset-2 hover:underline"
              style={{ color: "var(--accent)" }}
            >
              <Bug size={13} /> Report a bug or ask for a feature
            </a>
          </p>
        </footer>
        </div>
      </div>

      {showWhy1729 && <Why1729 onClose={() => setShowWhy1729(false)} />}
    </>
  );
}
