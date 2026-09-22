export type Rarity = "signature" | "common" | "uncommon" | "rare" | "legendary";

export interface Card {
  id: number;
  category: string;
  name: string;
  effect: string;
  vibe: string;
  /* Optional metadata (present on the 1729-card deck) — drives flavour + replay value. */
  commentary?: string; // longer sports-commentator phrasing (Settings toggle)
  detail?: string; // richer description: how it plays + a tip (shown under the rule)
  callout?: string;
  intensity?: number; // 1 (chill) .. 5 (chaos)
  rarity?: Rarity;
  tags?: string[];
}

/* Badge styling per rarity — used on the card face. */
export const RARITY_STYLE: Record<Rarity, { label: string; color: string }> = {
  signature: { label: "Signature", color: "#34d399" },
  common: { label: "Common", color: "#9ca3af" },
  uncommon: { label: "Uncommon", color: "#60a5fa" },
  rare: { label: "Rare", color: "#a78bfa" },
  legendary: { label: "Legendary", color: "#fbbf24" },
};

export const CATEGORIES = [
  "Shot Restriction",
  "Body & Movement",
  "Wild Card / Swap",
  "Penalty",
  "Bonus / Reward",
  "Social & Party",
  "Strategy / Skill",
  "Wacky / Chaos",
  "Court / Environment",
  "Meta & Game-Flow",
] as const;

export type DeckMode = "family" | "party" | "drill" | "tournament" | "chaos";

export const DECK_MODES: Record<DeckMode, { label: string; description: string; categories: string[]; emoji: string }> = {
  family: {
    label: "Family",
    description: "Fun for all ages",
    emoji: "👨‍👩‍👧‍👦",
    categories: ["Shot Restriction", "Body & Movement", "Bonus / Reward", "Strategy / Skill"],
  },
  party: {
    label: "Party",
    description: "Laughs, dares & drinks",
    emoji: "🎉",
    categories: ["Social & Party", "Wacky / Chaos", "Wild Card / Swap", "Penalty", "Bonus / Reward"],
  },
  drill: {
    label: "Drill",
    description: "Sharpen your game",
    emoji: "🎯",
    categories: ["Shot Restriction", "Strategy / Skill", "Body & Movement"],
  },
  tournament: {
    label: "Tournament",
    description: "Competitive twists",
    emoji: "🏆",
    categories: ["Shot Restriction", "Strategy / Skill", "Meta & Game-Flow"],
  },
  chaos: {
    label: "Chaos",
    description: "Anything goes",
    emoji: "🌀",
    categories: [...CATEGORIES],
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Shot Restriction": "from-red-500 to-orange-500",
  "Body & Movement": "from-orange-500 to-yellow-500",
  "Wild Card / Swap": "from-purple-500 to-pink-500",
  "Penalty": "from-gray-600 to-gray-800",
  "Bonus / Reward": "from-green-500 to-emerald-500",
  "Social & Party": "from-pink-500 to-rose-500",
  "Strategy / Skill": "from-blue-500 to-cyan-500",
  "Wacky / Chaos": "from-yellow-400 to-amber-500",
  "Court / Environment": "from-teal-500 to-green-500",
  "Meta & Game-Flow": "from-indigo-500 to-violet-500",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  "Shot Restriction": "🏓",
  "Body & Movement": "🤸",
  "Wild Card / Swap": "🔄",
  "Penalty": "⚠️",
  "Bonus / Reward": "⭐",
  "Social & Party": "🥳",
  "Strategy / Skill": "🧠",
  "Wacky / Chaos": "🤪",
  "Court / Environment": "🏟️",
  "Meta & Game-Flow": "🎲",
};

// Plain-language, jargon-free description of each category — shown in the
// per-card "?" explainer so a first-time player understands what *kind* of
// card they drew (a rule? a dare? a reward?) without knowing the app.
export const CATEGORY_INFO: Record<string, string> = {
  "Shot Restriction": "A rule card — it limits how you're allowed to hit for this one point. Play the point under the limit; break it and you lose the point.",
  "Body & Movement": "A movement challenge — it changes how you move or stand for this point (like a spin or a stance). Just try your best and have fun with it.",
  "Wild Card / Swap": "A shake-up card — it swaps something around, like partners, sides, or who serves. Follow what it says, then play on.",
  "Penalty": "A setback card — one team gives up a small advantage. It's meant to be playful, not mean.",
  "Bonus / Reward": "A reward card — one team gets a perk or extra points. Enjoy the boost!",
  "Social & Party": "A fun/social card — a lighthearted dare or group moment. No skill needed, just play along.",
  "Strategy / Skill": "A skill card — it nudges you to try a smarter shot or tactic this point. A good chance to learn something.",
  "Wacky / Chaos": "A chaos card — something silly or unexpected. Roll with it; it's about laughs, not winning.",
  "Court / Environment": "An environment card — it changes the court or conditions for this point. Adjust and keep playing.",
  "Meta & Game-Flow": "A game-flow card — it changes the score, the serve, or how the game runs. Read it, apply it, carry on.",
};

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getFilteredCards(cards: Card[], mode: DeckMode): Card[] {
  const cats = DECK_MODES[mode].categories;
  return cards.filter((c) => cats.includes(c.category));
}

// ── Skill levels (beginner / intermediate / advanced) ────────────────
// A second way onto the court, aimed at newer players. Filters by BOTH the
// category (which twists make sense yet) AND intensity (how disruptive), so
// beginners get clear, low-chaos cards and advanced players get everything.
export type SkillLevel = "beginner" | "intermediate" | "advanced";

export const SKILL_LEVELS: Record<
  SkillLevel,
  { label: string; description: string; categories: string[]; maxIntensity: number; plain: boolean }
> = {
  beginner: {
    label: "Beginner",
    description: "Easy twists, clear rules",
    categories: ["Shot Restriction", "Strategy / Skill", "Body & Movement", "Bonus / Reward"],
    maxIntensity: 2,
    plain: true, // concise text, bigger type, no commentator voice
  },
  intermediate: {
    label: "Intermediate",
    description: "More variety, a little spice",
    categories: [
      "Shot Restriction", "Strategy / Skill", "Body & Movement", "Bonus / Reward",
      "Social & Party", "Court / Environment", "Wild Card / Swap",
    ],
    maxIntensity: 3,
    plain: false,
  },
  advanced: {
    label: "Advanced",
    description: "Everything, including chaos",
    categories: [...CATEGORIES],
    maxIntensity: 5,
    plain: false,
  },
};

export function isSkillLevel(key: string): key is SkillLevel {
  return key in SKILL_LEVELS;
}

export function getCardsForLevel(cards: Card[], level: SkillLevel): Card[] {
  const { categories, maxIntensity } = SKILL_LEVELS[level];
  const cats = new Set(categories);
  return cards.filter((c) => cats.has(c.category) && (c.intensity ?? 3) <= maxIntensity);
}

// Resolve any landing selection (themed deck mode OR skill level) to a card pool.
export function getDeck(cards: Card[], key: string): Card[] {
  if (isSkillLevel(key)) return getCardsForLevel(cards, key);
  return getFilteredCards(cards, key as DeckMode);
}

// Human label for a selection key (used on resume, headers).
export function selectionLabel(key: string): string {
  if (isSkillLevel(key)) return SKILL_LEVELS[key].label;
  return DECK_MODES[key as DeckMode]?.label ?? key;
}
