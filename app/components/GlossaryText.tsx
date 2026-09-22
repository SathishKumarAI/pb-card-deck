"use client";

import { useState, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY_BY_ALIAS, GlossaryTerm } from "@/lib/glossary";

// Escapes a string for safe use inside a RegExp.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Alternation source of all glossary aliases, longest-first so multi-word
// terms win. Word-boundary anchored. A fresh RegExp is built per call from this
// (never a shared stateful one) so matching is pure.
const TERM_PATTERN = `\\b(${GLOSSARY_BY_ALIAS.map((e) => escapeRegExp(e.alias)).join("|")})\\b`;

function lookup(match: string): GlossaryTerm | undefined {
  const lower = match.toLowerCase();
  return GLOSSARY_BY_ALIAS.find((e) => e.alias.toLowerCase() === lower)?.term;
}

type Segment = { text: string; term?: GlossaryTerm };

/**
 * Renders a string with known pickleball terms underlined and tappable.
 * Tapping a term opens a small definition popover. Each distinct term is made
 * tappable only on its first occurrence to avoid a wall of underlines.
 * The definition popover is portalled to <body>, so it looks the same whether
 * the term sits on a dark card face or a light sheet.
 */
export default function GlossaryText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const segments = useMemo<Segment[]>(() => {
    const text = children ?? "";
    const out: Segment[] = [];
    const seen = new Set<string>();
    let last = 0;
    const re = new RegExp(TERM_PATTERN, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const term = lookup(m[0]);
      const key = term?.term ?? m[0].toLowerCase();
      // Only mark the first occurrence of each term.
      if (!term || seen.has(key)) continue;
      seen.add(key);
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ text: m[0], term });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  }, [children]);

  // No known terms — render plain to keep DOM light.
  if (!segments.some((s) => s.term)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (!seg.term) return <Fragment key={i}>{seg.text}</Fragment>;
        const isOpen = openIdx === i;
        return (
          <span key={i} className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIdx(isOpen ? null : i);
              }}
              aria-label={`What is ${seg.term.term}?`}
              className="underline decoration-dotted underline-offset-2 font-semibold cursor-help"
              style={{ textDecorationThickness: "1.5px", color: "inherit" }}
            >
              {seg.text}
            </button>
            {isOpen && typeof document !== "undefined" && createPortal(
              <>
                {/* Scrim + popover are portalled to <body> so neither the card's
                    overflow-hidden nor its 3D transform (which traps position:
                    fixed) can clip or mis-anchor the definition. */}
                <div
                  className="fixed inset-0 z-[95]"
                  onClick={() => setOpenIdx(null)}
                />
                <div
                  role="tooltip"
                  onClick={(e) => e.stopPropagation()}
                  className="anim-pop fixed left-1/2 bottom-6 z-[96] -translate-x-1/2 w-[min(90vw,22rem)] rounded-2xl p-4 text-left text-sm leading-relaxed shadow-2xl"
                  style={{
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    border: "1px solid var(--accent)",
                    paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                  }}
                >
                  <span className="block font-bold mb-1 text-base" style={{ color: "var(--accent)" }}>
                    {seg.term.term}
                  </span>
                  {seg.term.def}
                </div>
              </>,
              document.body,
            )}
          </span>
        );
      })}
    </span>
  );
}
