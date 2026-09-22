import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shared shell for the static info pages: privacy, terms, about (backlog
// F243–F246). Centered readable prose with a Back link to the game.
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto min-h-[100dvh] w-full max-w-2xl px-5 py-8"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
      }}
    >
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--accent)" }}
      >
        <ArrowLeft size={16} aria-hidden /> Back to the game
      </Link>
      <article className="info-prose">{children}</article>
    </main>
  );
}
