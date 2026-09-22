// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";
import CardDisplay from "@/components/CardDisplay";
import ScoreKeeper from "@/components/ScoreKeeper";
import PlayerNames from "@/components/PlayerNames";
import OfficialMatchSetup from "@/components/OfficialMatchSetup";
import TournamentSetup from "@/components/tournament/TournamentSetup";
import { createGame, addScore, type GameSession } from "@/lib/game";
import type { Card } from "@/lib/cards";

expect.extend(matchers);

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
}

const card: Card = {
  id: 1,
  category: "Shot Restriction",
  name: "Dinks Only",
  effect: "All shots this point must be dinks.",
  vibe: "Soft-game showdown",
  detail: "Strips your power game down to touch. Stay loose, stay sharp.",
  callout: "Let's go!",
  intensity: 2,
  rarity: "common",
  tags: ["control"],
};

// Backlog F161 / F258 - automated a11y checks on the primary game surfaces.
describe("accessibility (axe)", () => {
  it("CardDisplay has no detectable violations", async () => {
    const { container } = render(
      <CardDisplay card={card} onDraw={() => {}} deckRemaining={42} onFavorite={() => {}} onSkip={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("ScoreKeeper has no detectable violations", async () => {
    let game: GameSession = createGame("chaos");
    game = addScore(game, 1);
    const { container } = render(
      <ScoreKeeper game={game} onScore={() => {}} onSideOut={() => {}} onAdjust={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * Every control someone types into must announce what it is.
 *
 * Measured in the running app before this existed: NINE fields - the whole
 * tournament setup form, both official-match name boxes, the event label, the
 * team-name editor and the hidden import picker - had no accessible name at
 * all. A screen reader read them as unnamed edit boxes and number spinners.
 */
describe("form controls have accessible names", () => {
  const nameOf = (el: HTMLElement): string => {
    const aria = el.getAttribute("aria-label");
    if (aria?.trim()) return aria;
    const by = el.getAttribute("aria-labelledby");
    if (by) return document.getElementById(by)?.textContent?.trim() ?? "";
    if (el.id) {
      const l = document.querySelector(`label[for="${el.id}"]`);
      if (l?.textContent?.trim()) return l.textContent.trim();
    }
    return el.closest("label")?.textContent?.trim() ?? "";
  };

  const everyFieldNamed = (container: HTMLElement) => {
    const fields = [...container.querySelectorAll<HTMLElement>("input, textarea, select")];
    expect(fields.length).toBeGreaterThan(0);
    const unnamed = fields.filter((f) => !nameOf(f)).map((f) => f.getAttribute("placeholder") || f.tagName);
    expect(unnamed, `unnamed fields: ${unnamed.join(", ")}`).toEqual([]);
  };

  it("names both boxes in the team-name editor", () => {
    const { container } = render(
      <PlayerNames names={{ team1: "A", team2: "B" }} onSave={() => {}} />,
    );
    everyFieldNamed(container);
  });

  it("names every field in the Track a match setup", () => {
    const { container } = render(<OfficialMatchSetup onStart={() => {}} />);
    everyFieldNamed(container);
  });

  it("names every field in the tournament setup, spinners included", () => {
    const { container } = render(<TournamentSetup onCancel={() => {}} onCreate={() => {}} />);
    everyFieldNamed(container);
  });
});
