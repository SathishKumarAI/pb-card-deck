"use client";

import { useEffect, useState } from "react";
import { Layers, Plus, Trash2, Play, X, Share2, Copy, ClipboardPaste } from "lucide-react";
import { CATEGORIES } from "@/lib/cards";
import { listDecks, saveDeck, deleteDeck, encodeDeck, importDeckCode, CustomDeck } from "@/lib/client-api";
import { Sheet } from "./HistoryPanel";
import { useToast } from "./Toast";

type DraftCard = { name: string; effect: string; category: string };

export default function DecksPanel({
  open,
  onClose,
  onPlay,
}: {
  open: boolean;
  onClose: () => void;
  onPlay: (deck: CustomDeck) => void;
}) {
  const [decks, setDecks] = useState<CustomDeck[]>([]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState("");
  const toast = useToast();

  const load = () => setDecks(listDecks());
  useEffect(() => { if (open) { load(); setCreating(false); setImporting(false); setCode(""); } }, [open]);

  const share = async (d: CustomDeck) => {
    const text = encodeDeck(d);
    try {
      await navigator.clipboard.writeText(text);
      toast("Deck code copied - share it to import elsewhere");
    } catch {
      toast("Couldn't copy - select and copy manually");
    }
  };

  const clone = (d: CustomDeck) => {
    saveDeck({ name: `${d.name} (copy)`.slice(0, 60), description: d.description, cards: d.cards });
    load();
    toast("Deck cloned");
  };

  const doImport = () => {
    const saved = importDeckCode(code);
    if (saved) {
      setImporting(false);
      setCode("");
      load();
      toast(`Imported "${saved.name}"`);
    } else {
      toast("That code didn't look like a deck");
    }
  };

  if (!open) return null;

  return (
    <Sheet title="Custom decks" icon={<Layers size={18} />} onClose={onClose}>
      {creating ? (
        <DeckEditor onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCreating(true)}
              className="pressable flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <Plus size={18} /> New deck
            </button>
            <button
              onClick={() => setImporting((v) => !v)}
              aria-expanded={importing}
              className="pressable flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <ClipboardPaste size={16} /> Import
            </button>
          </div>

          {importing && (
            <div className="flex gap-2 mb-4">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste a deck code"
                aria-label="Deck code"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <button
                onClick={doImport}
                disabled={!code.trim()}
                className="pressable px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Add
              </button>
            </div>
          )}

          {decks.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No custom decks yet. Build your own twist cards!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {decks.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{d.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{d.cards.length} cards{d.description ? ` · ${d.description}` : ""}</div>
                  </div>
                  <button
                    onClick={() => onPlay(d)}
                    disabled={d.cards.length === 0}
                    className="pressable p-2 rounded-full disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    aria-label={`Play ${d.name}`}
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => share(d)}
                    className="pressable p-2 rounded-full"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                    aria-label={`Share ${d.name}`}
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={() => clone(d)}
                    className="pressable p-2 rounded-full"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                    aria-label={`Clone ${d.name}`}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => { deleteDeck(d.id); load(); }}
                    className="pressable p-2 rounded-full"
                    style={{ background: "var(--bg-elevated)", color: "var(--red)" }}
                    aria-label={`Delete ${d.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function DeckEditor({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [draft, setDraft] = useState<DraftCard>({ name: "", effect: "", category: CATEGORIES[0] });

  const addCard = () => {
    if (!draft.name.trim() || !draft.effect.trim()) return;
    setCards([...cards, draft]);
    setDraft({ name: "", effect: "", category: draft.category });
  };

  const save = () => {
    if (!name.trim() || cards.length === 0) return;
    saveDeck({ name: name.trim(), description: description.trim(), cards });
    onSaved();
  };

  const input = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" } as const;

  return (
    <div className="flex flex-col gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" className={input} style={inputStyle} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={input} style={inputStyle} />

      {cards.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {cards.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--bg-elevated)" }}>
              <span className="font-semibold" style={{ color: "var(--text)" }}>{c.name}</span>
              <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{c.effect}</span>
              <button onClick={() => setCards(cards.filter((_, j) => j !== i))} style={{ color: "var(--red)" }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--bg-card)", border: "1px dashed var(--border)" }}>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Card name" className={input} style={inputStyle} />
        <textarea value={draft.effect} onChange={(e) => setDraft({ ...draft, effect: e.target.value })} placeholder="What happens?" rows={2} className={input} style={inputStyle} />
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={input} style={inputStyle}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={addCard} className="pressable flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--bg-elevated)", color: "var(--accent)" }}>
          <Plus size={16} /> Add card
        </button>
      </div>

      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="pressable flex-1 px-4 py-2.5 rounded-full text-sm font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>Cancel</button>
        <button onClick={save} disabled={!name.trim() || cards.length === 0} className="pressable flex-1 px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          Save deck ({cards.length})
        </button>
      </div>
    </div>
  );
}
