"use client";

import { useState } from "react";
import { MessageSquare, Star, Send, Check, Bug, ExternalLink } from "lucide-react";
import { Sheet } from "./HistoryPanel";

const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "sathishkumar786.ml@gmail.com";
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/SathishKumarAI/pb-card-deck";
// Set NEXT_PUBLIC_FEEDBACK_FORM_URL to a Google Form link to make it the primary feedback channel.
const FORM_URL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL || "";
const FEEDBACK_KEY = "pb-feedback";

export default function FeedbackPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  if (!open) return null;

  const send = () => {
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setEmailError("Enter a valid email, or leave it blank.");
      return;
    }
    setEmailError("");
    // Keep a local copy as backup.
    try {
      const prev = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
      prev.unshift({ rating, message, contact, at: Date.now() });
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(prev.slice(0, 50)));
    } catch {}

    const subject = `PB Card Deck feedback${rating ? ` - ${rating}★` : ""}`;
    const body =
      `Rating: ${rating ? `${rating}/5` : "-"}\n\n` +
      `${message || "(no message)"}\n\n` +
      (contact ? `Reply to: ${contact}\n` : "") +
      `\n- sent from PB Card Deck`;
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const reset = () => { setRating(0); setHover(0); setMessage(""); setContact(""); setSent(false); };
  const close = () => { reset(); onClose(); };

  const input = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" } as const;

  return (
    <Sheet title="Send feedback" icon={<MessageSquare size={18} />} onClose={close}>
      {sent ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <span className="flex items-center justify-center w-14 h-14 rounded-full anim-pop" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            <Check size={28} />
          </span>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>Almost done - send the email</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>We opened your email app with the feedback ready. Tap <strong>send</strong> there to finish. If it didn&apos;t open, email us at {FEEDBACK_EMAIL}.</p>
          <button onClick={close} className="pressable mt-2 px-6 py-2.5 rounded-full text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Done</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-4">
          {/* Google Form - primary channel when configured */}
          {FORM_URL && (
            <a
              href={FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <ExternalLink size={18} /> Open feedback form
            </a>
          )}

          {/* Rating */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>How&apos;s your experience?</span>
            <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  className="pressable p-1"
                  style={{ color: (hover || rating) >= n ? "var(--yellow)" : "var(--text-muted)" }}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star size={30} fill={(hover || rating) >= n ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you love? What's missing? Found a bug?"
            aria-label="Your feedback"
            rows={4}
            className={input}
            style={inputStyle}
          />
          <div>
            <input
              value={contact}
              onChange={(e) => { setContact(e.target.value); if (emailError) setEmailError(""); }}
              placeholder="Your email (optional, so we can reply)"
              type="email"
              aria-label="Your email (optional)"
              aria-invalid={!!emailError}
              className={input}
              style={inputStyle}
            />
            {emailError && <p className="mt-1 text-xs" style={{ color: "var(--red)" }}>{emailError}</p>}
          </div>

          <button
            type="submit"
            disabled={!rating && !message.trim()}
            className="pressable flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Send size={18} /> Send feedback
          </button>

          <p className="text-center text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            This app is made just for fun and personal use - not for making sales.
            Prefer GitHub?{" "}
            <a
              href={`${GITHUB_URL}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              style={{ color: "var(--accent)" }}
            >
              <Bug size={12} /> Request a feature or raise an issue
            </a>
          </p>
        </form>
      )}
    </Sheet>
  );
}
