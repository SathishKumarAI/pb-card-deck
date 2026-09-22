import {
  Users, PartyPopper, Target, Trophy, Shuffle,
  Ban, Activity, Repeat, AlertTriangle, Gift, Brain, Sparkles, LandPlot, Dice5,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { DeckMode } from "@/lib/cards";

export const MODE_ICONS: Record<DeckMode, LucideIcon> = {
  family: Users,
  party: PartyPopper,
  drill: Target,
  tournament: Trophy,
  chaos: Shuffle,
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Shot Restriction": Ban,
  "Body & Movement": Activity,
  "Wild Card / Swap": Repeat,
  "Penalty": AlertTriangle,
  "Bonus / Reward": Gift,
  "Social & Party": PartyPopper,
  "Strategy / Skill": Brain,
  "Wacky / Chaos": Sparkles,
  "Court / Environment": LandPlot,
  "Meta & Game-Flow": Dice5,
};

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] || Shuffle;
}

// Stable component wrapper so callers don't derive a component during render.
export function CategoryIcon({ category, ...props }: { category: string } & ComponentProps<LucideIcon>) {
  const Icon = CATEGORY_ICONS[category] || Shuffle;
  return <Icon {...props} />;
}

/**
 * A pickleball, drawn rather than borrowed: lucide has no ball with holes, and
 * a generic shuffle glyph on the deck back said "card game" without ever saying
 * which sport. Holes are laid out like a real ball - a ring of six around one
 * centre - and inherit `currentColor` so it works on any surface.
 */
export function PickleballMark({ size = 48, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const holes = [
    [0, 0],
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return [Math.cos(a) * 9.5, Math.sin(a) * 9.5] as const;
    }),
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-16 -16 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      <circle r="14.2" stroke="currentColor" strokeWidth="1.6" opacity="0.95" />
      {holes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.1" fill="currentColor" opacity={i === 0 ? 0.55 : 0.42} />
      ))}
    </svg>
  );
}
