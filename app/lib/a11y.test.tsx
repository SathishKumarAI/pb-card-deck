// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";
import CardDisplay from "@/components/CardDisplay";
import ScoreKeeper from "@/components/ScoreKeeper";
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
