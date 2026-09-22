"use client";

/**
 * The manual. Owns how help is FOUND - search, quick links, the section index,
 * one open answer at a time. It owns none of the words: those live in
 * lib/manual.ts, and the pickleball terms come from lib/glossary.ts so this
 * panel and the tap-to-define highlighter can never disagree.
 */

import { useMemo, useState } from "react";
import { BookOpen, Search, ChevronDown, Compass, X, CornerDownLeft } from "lucide-react";
import { Sheet } from "./HistoryPanel";
import { MANUAL, QUICK_LINKS, searchManual, type ManualEntry } from "@/lib/manual";
import GlossaryText from "./GlossaryText";
import { GLOSSARY } from "@/lib/glossary";

export default function HelpPanel({
  open,
  onClose,
  onReplayTour,
}: {
  open: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openQ, setOpenQ] = useState<string | null>(null);

  const results = useMemo(() => (query.trim() ? searchManual(query) : null), [query]);

  if (!open) return null;

  const show = (q: string) => {
    setQuery("");
    setOpenQ(q);
    // Let the accordion render before scrolling the answer into view.
    requestAnimationFrame(() => {
      document.getElementById(`help-${slug(q)}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  return (
    <Sheet title="Help" icon={<BookOpen size={18} />} onClose={onClose}>
      {/* Search - the fastest path for anyone who knows what they want */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help - try 'serve' or 'undo'"
          aria-label="Search help"
          className="w-full rounded-full py-2.5 pl-10 pr-10 outline-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 16,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="pressable absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {results ? (
        /* ─── Search results ─── */
        results.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text)" }}>
              No answer mentions &ldquo;{query.trim()}&rdquo;.
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Try a single word - serve, undo, backup, offline - or browse the sections below.
            </p>
            <button
              onClick={() => setQuery("")}
              className="pressable mt-4 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Show all help
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {results.length} {results.length === 1 ? "answer" : "answers"}
            </p>
            {results.map(({ section, entry }) => (
              <Answer
                key={entry.q}
                entry={entry}
                context={section.title}
                isOpen={openQ === entry.q}
                onToggle={() => setOpenQ(openQ === entry.q ? null : entry.q)}
              />
            ))}
          </div>
        )
      ) : (
        /* ─── Browse ─── */
        <>
          <nav className="mb-5 flex flex-col gap-1.5" aria-label="Common questions">
            {QUICK_LINKS.map((q) => (
              <button
                key={q}
                onClick={() => show(q)}
                className="pressable flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {q}
                <CornerDownLeft size={14} style={{ color: "var(--accent)" }} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-6">
            {MANUAL.map((section) => (
              <section key={section.id}>
                <h3 className="font-display text-base font-bold" style={{ color: "var(--text)" }}>
                  {section.title}
                </h3>
                <p className="mb-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {section.blurb}
                </p>
                <div className="flex flex-col gap-2">
                  {section.entries.map((entry) => (
                    <Answer
                      key={entry.q}
                      entry={entry}
                      isOpen={openQ === entry.q}
                      onToggle={() => setOpenQ(openQ === entry.q ? null : entry.q)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Glossary, shared with the in-card tap-to-define highlighter */}
            <section>
              <h3 className="font-display text-base font-bold" style={{ color: "var(--text)" }}>
                Pickleball words
              </h3>
              <p className="mb-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                The same definitions you get by tapping an underlined word on a card.
              </p>
              <dl className="flex flex-col gap-2">
                {GLOSSARY.map((term) => (
                  <div
                    key={term.term}
                    className="rounded-xl px-3.5 py-2.5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <dt className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {term.term}
                    </dt>
                    <dd className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {term.def}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {onReplayTour && (
            <button
              onClick={onReplayTour}
              className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <Compass size={15} style={{ color: "var(--accent)" }} /> Replay the welcome tour
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

function slug(q: string) {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Answer({
  entry,
  context,
  isOpen,
  onToggle,
}: {
  entry: ManualEntry;
  /** Section name, shown only in search results where the heading is missing. */
  context?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const id = `help-${slug(entry.q)}`;
  return (
    <div
      id={id}
      className="overflow-hidden rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-body`}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
            {entry.q}
          </span>
          {context && (
            <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-muted)" }}>
              {context}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{ color: isOpen ? "var(--accent)" : "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div id={`${id}-body`} className="px-3.5 pb-3.5">
          {/* Answers underline pickleball terms exactly like a card does, so
              "transition zone" explains itself wherever it appears. */}
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <GlossaryText>{entry.a}</GlossaryText>
          </p>
          {entry.points && (
            <ul className="mt-3 flex flex-col gap-2">
              {entry.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                    <GlossaryText>{point}</GlossaryText>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {entry.steps && (
            <ol className="mt-3 flex flex-col gap-2">
              {entry.steps.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span
                    className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                    <GlossaryText>{step}</GlossaryText>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
