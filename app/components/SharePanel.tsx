"use client";

/**
 * The share sheet: pick a shape, look at the actual image, send it.
 *
 * Owns the choosing and the handing-over. The picture itself is drawn by
 * lib/shareImage.ts onto a canvas this panel renders directly - so the preview
 * IS the file, not an HTML approximation of it that turns out different once
 * exported.
 *
 * Instagram has no web posting API and never has. The honest path is the
 * phone's own share sheet (where Instagram and WhatsApp appear) or Save, then
 * post from the camera roll - and the copy says so rather than implying a
 * one-tap post that cannot exist.
 */

import { useEffect, useRef, useState } from "react";
import { Share2, Download, Copy, Check, X, Smartphone } from "lucide-react";
import {
  SHAPE_INFO, drawCard, shareCard, cardCaption, type ShareCard, type ShareShape,
} from "@/lib/shareImage";
import { useToast } from "./Toast";
import { useScrollLock } from "@/lib/useScrollLock";

export default function SharePanel({
  card,
  onClose,
  title = "Share",
}: {
  card: ShareCard;
  onClose: () => void;
  title?: string;
}) {
  const [shape, setShape] = useState<ShareShape>("square");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();
  useScrollLock(true);

  const caption = cardCaption(card);

  // Redraw whenever the shape changes. The canvas is full-size (1080px wide)
  // and scaled down by CSS, so the preview and the export cannot drift.
  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, card, shape);
  }, [card, shape]);

  const send = async () => {
    setBusy(true);
    const out = await shareCard(card, shape, caption);
    setBusy(false);
    if (out === "shared") toast("Shared");
    else if (out === "downloaded") toast("Image saved - post it from your phone");
    else if (out === "failed") toast("Could not share that image");
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy the caption");
    }
  };

  const { w, h } = SHAPE_INFO[shape];

  return (
    <div
      className="sheet-scrim fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mat-thick sheet-rise scroll-area w-full max-w-md max-h-[92dvh] p-5"
        style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-sheet)", boxShadow: "var(--elev-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold" style={{ color: "var(--text)" }}>
            <Share2 size={18} /> {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="pressable p-1.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Shape first: it changes the picture, so it goes above it. */}
        <div className="mat-thin flex gap-1 p-1 mb-3" style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-chip)" }}>
          {(Object.keys(SHAPE_INFO) as ShareShape[]).map((s) => (
            <button
              key={s}
              onClick={() => setShape(s)}
              aria-pressed={shape === s}
              className="pressable flex-1 px-2 py-2 rounded-full text-sm font-semibold transition-colors"
              style={shape === s ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--text-secondary)" }}
            >
              {SHAPE_INFO[s].label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-center mb-3 tnum" style={{ color: "var(--text-muted)" }}>
          {SHAPE_INFO[shape].blurb} · {w}×{h}
        </p>

        {/* The preview is the file itself, scaled by CSS. */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="max-h-[42dvh] w-auto"
            style={{
              aspectRatio: `${w} / ${h}`,
              borderRadius: "var(--r-panel)",
              border: "1px solid var(--mat-edge)",
              maxWidth: "100%",
              boxShadow: "var(--elev-2)",
            }}
          />
        </div>

        <button
          onClick={send}
          disabled={busy}
          className="cta-accent pressable w-full flex items-center justify-center gap-2 px-6 py-3.5 font-bold disabled:opacity-60"
          style={{ borderRadius: "var(--r-chip)" }}
        >
          <Share2 size={17} /> {busy ? "Preparing…" : "Share image"}
        </button>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={send}
            className="pressable hoverable mat-thin flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold"
            style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
          >
            <Download size={15} /> Save
          </button>
          <button
            onClick={copyCaption}
            className="pressable hoverable mat-thin flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold"
            style={{ border: "1px solid var(--mat-edge)", borderRadius: "var(--r-ctl)", color: "var(--text)" }}
          >
            {copied ? <Check size={15} style={{ color: "var(--accent)" }} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy caption"}
          </button>
        </div>

        <details className="mt-3">
          <summary className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
            Caption
          </summary>
          <pre
            className="mt-2 whitespace-pre-wrap text-xs leading-relaxed p-3"
            style={{ background: "var(--bg-elevated)", borderRadius: "var(--r-ctl)", color: "var(--text-secondary)", fontFamily: "inherit" }}
          >
            {caption}
          </pre>
        </details>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <Smartphone size={13} className="shrink-0 mt-0.5" />
          <span>
            On a phone, <strong style={{ color: "var(--text-secondary)" }}>Share image</strong> opens your own share
            sheet - Instagram, WhatsApp and the rest are in there. On a laptop it saves the PNG instead, since neither
            app can be posted to from a browser.
          </span>
        </p>
      </div>
    </div>
  );
}
