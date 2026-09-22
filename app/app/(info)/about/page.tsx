import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "About PB Card Deck - 1,729 twist cards and a real scorekeeper.",
};

const GITHUB_URL = "https://github.com/SathishKumarAI/pb-card-deck";

// Backlog F246 (+ links to F243/F244/F245).
export default function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p className="lede">
        PB Card Deck pairs a real side-out scorekeeper with 1,729 twist cards.
        Draw a card, play the next point under that twist, keep score - all on your phone,
        no login, works offline.
      </p>

      <h2>Why local-first</h2>
      <p>
        Players open the link mid-game; a signup wall loses them and courts have bad signal.
        So the app deliberately has no backend and no login. Your data stays on your device,
        with manual Export / Import to move it between phones.
      </p>

      <h2>The number 1,729</h2>
      <p>
        PB Card Deck holds exactly 1,729 cards - the Ramanujan taxicab number, the smallest number
        expressible as the sum of two cubes in two different ways (1&sup3; + 12&sup3; = 9&sup3; + 10&sup3;).
      </p>

      <h2>Links</h2>
      <ul>
        <li><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Source code on GitHub</a></li>
        <li><Link href="/privacy">Privacy policy</Link></li>
        <li><Link href="/terms">Terms of use</Link></li>
      </ul>

      <h2>Accessibility</h2>
      <p>
        We&apos;re working toward WCAG 2.2 AA: keyboard navigation, screen-reader labels,
        reduced-motion support, and high-contrast colors. Found a barrier? Use
        <strong> Send feedback</strong> in the app menu - we want to fix it.
      </p>
    </>
  );
}
