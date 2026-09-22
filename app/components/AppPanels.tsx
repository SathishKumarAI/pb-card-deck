"use client";

/**
 * Every menu-reachable sheet, in one place: history, decks, favourites,
 * feedback, help, the card browser, achievements and the welcome tour.
 *
 * The home screen and the game screen both render this. They each used to
 * carry their own verbatim copy of the list, which is how one of them ended up
 * a panel behind the other.
 */

import type { Card } from "@/lib/cards";
import type { CustomDeck } from "@/lib/client-api";
import type { PanelFlags, PanelName } from "@/lib/usePanels";
import HistoryPanel from "@/components/HistoryPanel";
import DecksPanel from "@/components/DecksPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import FeedbackPanel from "@/components/FeedbackPanel";
import HelpPanel from "@/components/HelpPanel";
import CardBrowserPanel from "@/components/CardBrowserPanel";
import AchievementsPanel from "@/components/AchievementsPanel";
import WelcomeTour from "@/components/WelcomeTour";

export interface AppPanelsProps {
  open: PanelFlags;
  onClose: (n: PanelName) => void;
  allCards: Card[];
  favoriteCards: Card[];
  onPlayDeck: (d: CustomDeck) => void;
  onRemoveFavorite: (id: number) => void;
  tourOpen: boolean;
  onCloseTour: () => void;
  onReplayTour: () => void;
  /** Tour -> "read the manual": closes the tour and opens Help. */
  onTourHelp: () => void;
}

export default function AppPanels({
  open, onClose, allCards, favoriteCards, onPlayDeck, onRemoveFavorite,
  tourOpen, onCloseTour, onReplayTour, onTourHelp,
}: AppPanelsProps) {
  return (
    <>
      <HistoryPanel open={open.history} onClose={() => onClose("history")} />
      <DecksPanel open={open.decks} onClose={() => onClose("decks")} onPlay={onPlayDeck} />
      <FavoritesPanel
        open={open.favorites}
        onClose={() => onClose("favorites")}
        cards={favoriteCards}
        onRemove={onRemoveFavorite}
      />
      <FeedbackPanel open={open.feedback} onClose={() => onClose("feedback")} />
      <HelpPanel open={open.rules} onClose={() => onClose("rules")} onReplayTour={onReplayTour} />
      <CardBrowserPanel open={open.browser} onClose={() => onClose("browser")} allCards={allCards} />
      <AchievementsPanel open={open.achievements} onClose={() => onClose("achievements")} />
      <WelcomeTour
        open={tourOpen}
        onClose={onCloseTour}
        onOpenHelp={onTourHelp}
      />
    </>
  );
}
