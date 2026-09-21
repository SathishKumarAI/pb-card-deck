"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, History, Layers, Star, Download, Upload, MessageSquare, BookOpen, Check, AlertTriangle, Info, Trash2, Library, Award } from "lucide-react";
import { exportData, importData, clearAllData } from "@/lib/client-api";

export default function AppMenu({
  onOpenHistory,
  onOpenDecks,
  onOpenFavorites,
  onOpenFeedback,
  onOpenRules,
  onOpenBrowser,
  onOpenAchievements,
}: {
  onOpenHistory: () => void;
  onOpenDecks: () => void;
  onOpenFavorites: () => void;
  onOpenFeedback: () => void;
  onOpenRules: () => void;
  onOpenBrowser: () => void;
  onOpenAchievements: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showNotice = (msg: string, ok: boolean) => {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const doExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickleball-card-games-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const doDeleteAll = () => {
    setOpen(false);
    const ok = typeof window !== "undefined" &&
      window.confirm("Delete all local data - matches, custom decks, favorites and the current game? This cannot be undone.");
    if (!ok) return;
    clearAllData();
    window.location.reload();
  };

  const doImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { decks, matches } = importData(String(reader.result));
        showNotice(`Imported ${decks} deck(s) and ${matches} match(es).`, true);
      } catch {
        showNotice("Could not read that backup file.", false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setOpen(false);
  };

  return (
    <>
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="pressable p-2 rounded-full"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Menu size={18} />
      </button>

      {open && (
        <div role="menu" className="anim-pop absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50 shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <Item icon={<BookOpen size={16} />} label="Help & manual" onClick={() => { setOpen(false); onOpenRules(); }} />
          <Item icon={<Library size={16} />} label="Browse cards" onClick={() => { setOpen(false); onOpenBrowser(); }} />
          <Item icon={<History size={16} />} label="Match history" onClick={() => { setOpen(false); onOpenHistory(); }} />
          <Item icon={<Star size={16} />} label="Favorite cards" onClick={() => { setOpen(false); onOpenFavorites(); }} />
          <Item icon={<Award size={16} />} label="Achievements" onClick={() => { setOpen(false); onOpenAchievements(); }} />
          <Item icon={<Layers size={16} />} label="Custom decks" onClick={() => { setOpen(false); onOpenDecks(); }} />
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <Item icon={<Download size={16} />} label="Export backup" onClick={doExport} />
            <Item icon={<Upload size={16} />} label="Import backup" onClick={() => fileRef.current?.click()} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <Item icon={<MessageSquare size={16} />} label="Send feedback" onClick={() => { setOpen(false); onOpenFeedback(); }} />
            <Link
              href="/about"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ color: "var(--text)" }}
            >
              <span style={{ color: "var(--accent)" }}><Info size={16} /></span>
              About &amp; privacy
            </Link>
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={doDeleteAll}
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ color: "var(--red)" }}
            >
              <span style={{ color: "var(--red)" }}><Trash2 size={16} /></span>
              Delete all data
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
    </div>

    {notice && (
      <div
        role="status"
        aria-live="polite"
        className="fixed left-1/2 -translate-x-1/2 z-[60] anim-pop flex items-center gap-2 px-4 py-2.5 rounded-full text-sm shadow-2xl"
        style={{
          bottom: "max(1.5rem, env(safe-area-inset-bottom))",
          background: "var(--bg-card)",
          border: `1px solid ${notice.ok ? "var(--accent)" : "var(--red)"}`,
          color: "var(--text)",
        }}
      >
        {notice.ok ? <Check size={15} style={{ color: "var(--accent)" }} /> : <AlertTriangle size={15} style={{ color: "var(--red)" }} />}
        {notice.msg}
      </div>
    )}
    </>
  );
}

function Item({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ color: "var(--text)" }}
    >
      <span style={{ color: "var(--accent)" }}>{icon}</span>
      {label}
    </button>
  );
}
