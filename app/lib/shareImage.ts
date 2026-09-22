/**
 * Share cards, drawn on a canvas. No backend, no upload, no fonts to fetch.
 *
 * Owns PIXELS ONLY: what a card looks like at each aspect ratio. The numbers
 * come from lib/streaks.ts and lib/tournament, and components/SharePanel.tsx
 * owns choosing and sharing. Adding a card type means adding a `draw*`
 * function, not touching the sharing plumbing.
 *
 * Sizes are the ones the destinations actually want:
 *   square 1080x1080  Instagram feed, WhatsApp
 *   story  1080x1920  Instagram/WhatsApp story, full-bleed on a phone
 *   post   1080x1350  Instagram's tallest feed crop (4:5)
 * Anything else gets letterboxed by the app you paste it into, which is how
 * a good card ends up with grey bars down the side.
 */

import type { StreakStats } from "./streaks";
import { streakHeadline } from "./streaks";

export type ShareShape = "square" | "story" | "post";

export const SHAPE_INFO: Record<ShareShape, { label: string; blurb: string; w: number; h: number }> = {
  square: { label: "Square", blurb: "Instagram feed, WhatsApp", w: 1080, h: 1080 },
  story: { label: "Story", blurb: "Instagram or WhatsApp story", w: 1080, h: 1920 },
  post: { label: "Tall", blurb: "Instagram 4:5 feed", w: 1080, h: 1350 },
};

const INK = "#e9efec";
const MUTED = "#94a29e";
const ACCENT = "#34d399";
const GOLD = "#fbbf24";

/* ─────────────────────────── canvas helpers ─────────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** System stack, because a share card must not wait on a webfont. */
const face = (weight: number, size: number) =>
  `${weight} ${size}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif`;

/** Shrink text until it fits, and report the size used. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, weight = 800, min = 34) {
  let size = start;
  ctx.font = face(weight, size);
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 4;
    ctx.font = face(weight, size);
  }
  return size;
}

/** The court, the same motif as the app's backdrop. */
function drawCourt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0b0e0f");
  bg.addColorStop(0.55, "#101a17");
  bg.addColorStop(1, "#0b0e0f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // a warm lamp where the ball would be
  const glow = ctx.createRadialGradient(w * 0.2, h * 0.16, 0, w * 0.2, h * 0.16, w * 0.8);
  glow.addColorStop(0, "rgba(251,191,36,0.10)");
  glow.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(233,239,236,0.07)";
  ctx.lineWidth = 3;
  const inset = w * 0.075;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);        // sidelines
  for (const t of [0.34, 0.66]) {                                     // kitchen lines
    ctx.beginPath();
    ctx.moveTo(inset, h * t);
    ctx.lineTo(w - inset, h * t);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(233,239,236,0.11)";                         // net
  ctx.beginPath();
  ctx.moveTo(inset, h / 2);
  ctx.lineTo(w - inset, h / 2);
  ctx.stroke();
}

/** The app's pickleball, so a card is recognisable at thumbnail size. */
function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color = ACCENT) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, r * 0.11);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  const holes: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    holes.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62]);
  }
  for (const [dx, dy] of holes) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The usable area of a card: everything between the top margin and the footer.
 *
 * Positions used to be fixed offsets from the vertical centre, which works at
 * 1350px tall and collides with the footer at 1080 - the square card had its
 * stats row sitting on top of the wordmark. Laying out inside a box, in
 * fractions of its own height, holds at every shape.
 */
function box(h: number) {
  const footer = 160;
  const top = Math.round(h * 0.1);
  const bottom = h - footer;
  return { top, bottom, span: bottom - top, mid: (top + bottom) / 2, y: (f: number) => top + (bottom - top) * f };
}

function drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.textAlign = "center";
  drawBall(ctx, w / 2 - 148, h - 96, 20);
  ctx.fillStyle = ACCENT;
  ctx.font = face(700, 38);
  ctx.textAlign = "left";
  ctx.fillText("PB Card Deck", w / 2 - 112, h - 84);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = face(500, 30);
  ctx.fillText("pb-card-deck.vercel.app", w / 2, h - 40);
}

/* ─────────────────────────── the cards ─────────────────────────── */

export interface ResultCard {
  kind: "result";
  winnerName: string;
  score: { team1: number; team2: number };
  matchOver: boolean;
  seriesWon?: { team1: number; team2: number };
}

export interface StreakCard {
  kind: "streak";
  stats: StreakStats;
}

export interface TournamentCard {
  kind: "tournament";
  eventName: string;
  championName: string;
  /** Up to five rows, already ordered. */
  standings: { rank: number; name: string; wins: number; losses: number }[];
}

export type ShareCard = ResultCard | StreakCard | TournamentCard;

function drawResult(ctx: CanvasRenderingContext2D, w: number, h: number, card: ResultCard) {
  const b = box(h);
  ctx.textAlign = "center";

  ctx.fillStyle = ACCENT;
  ctx.font = face(700, 40);
  ctx.fillText(card.matchOver ? "MATCH WON" : "GAME WON", w / 2, b.y(0.08));

  ctx.fillStyle = INK;
  const size = fitText(ctx, card.winnerName, w - 200, Math.min(108, b.span * 0.11));
  ctx.font = face(800, size);
  ctx.fillText(card.winnerName, w / 2, b.y(0.26));

  ctx.fillStyle = GOLD;
  ctx.font = face(900, Math.min(210, b.span * 0.22));
  ctx.fillText(`${card.score.team1}–${card.score.team2}`, w / 2, b.y(0.62));

  if (card.seriesWon) {
    ctx.fillStyle = MUTED;
    ctx.font = face(600, 44);
    ctx.fillText(`Match ${card.seriesWon.team1}–${card.seriesWon.team2}`, w / 2, b.y(0.75));
  }
}

function drawStreak(ctx: CanvasRenderingContext2D, w: number, h: number, card: StreakCard) {
  const s = card.stats;
  const b = box(h);
  ctx.textAlign = "center";

  ctx.fillStyle = MUTED;
  ctx.font = face(700, 34);
  ctx.fillText("ON A STREAK", w / 2, b.y(0.04));

  ctx.fillStyle = INK;
  const nameSize = fitText(ctx, s.name, w - 180, Math.min(96, b.span * 0.1));
  ctx.font = face(800, nameSize);
  ctx.fillText(s.name, w / 2, b.y(0.17));

  // The number is the card.
  const big = s.current > 0 ? s.current : s.best;
  ctx.fillStyle = s.current > 0 ? GOLD : MUTED;
  ctx.font = face(900, Math.min(300, b.span * 0.34));
  ctx.fillText(String(big), w / 2, b.y(0.56));

  ctx.fillStyle = INK;
  ctx.font = face(700, Math.min(52, b.span * 0.06));
  ctx.fillText(s.current > 0 ? (s.current === 1 ? "win" : "wins in a row") : "best run", w / 2, b.y(0.65));

  // Recent results as dots - the shape of a run reads instantly.
  const dots = s.recent.slice(0, 10);
  if (dots.length) {
    const gap = Math.min(46, (w - 260) / Math.max(1, dots.length - 1));
    const r = Math.max(11, Math.min(17, gap * 0.37));
    const startX = w / 2 - ((dots.length - 1) * gap) / 2;
    dots.forEach((won, i) => {
      ctx.beginPath();
      ctx.arc(startX + i * gap, b.y(0.76), r, 0, Math.PI * 2);
      ctx.fillStyle = won ? ACCENT : "rgba(148,162,158,0.35)";
      ctx.fill();
    });
    ctx.fillStyle = MUTED;
    ctx.font = face(500, 26);
    ctx.fillText("most recent first", w / 2, b.y(0.82));
  }

  // Three facts across the bottom of the box, clear of the footer.
  const facts: [string, string][] = [
    [`${s.wins}`, "won"],
    [`${s.winRate}%`, "win rate"],
    [`${s.best}`, "best run"],
  ];
  const cellW = (w - 200) / 3;
  facts.forEach(([value, label], i) => {
    const cx = 100 + cellW * i + cellW / 2;
    ctx.fillStyle = INK;
    ctx.font = face(800, 56);
    ctx.fillText(value, cx, b.y(0.95));
    ctx.fillStyle = MUTED;
    ctx.font = face(500, 28);
    ctx.fillText(label, cx, b.y(1));
  });
}

function drawTournament(ctx: CanvasRenderingContext2D, w: number, h: number, card: TournamentCard) {
  const b = box(h);
  ctx.textAlign = "center";

  ctx.fillStyle = MUTED;
  const evSize = fitText(ctx, card.eventName.toUpperCase(), w - 200, 34, 700, 22);
  ctx.font = face(700, evSize);
  ctx.fillText(card.eventName.toUpperCase(), w / 2, b.y(0.03));

  ctx.fillStyle = GOLD;
  ctx.font = face(700, 36);
  ctx.fillText("CHAMPION", w / 2, b.y(0.12));

  ctx.fillStyle = INK;
  const size = fitText(ctx, card.championName, w - 180, Math.min(96, b.span * 0.1));
  ctx.font = face(800, size);
  ctx.fillText(card.championName, w / 2, b.y(0.26));

  // Standings, left-aligned inside a panel that ends inside the box.
  const rows = card.standings.slice(0, 5);
  const rowH = Math.min(78, (b.span * 0.62) / Math.max(1, rows.length));
  const panelTop = b.y(0.36);
  const panelH = rows.length * rowH + 40;
  ctx.fillStyle = "rgba(233,239,236,0.05)";
  roundRect(ctx, 100, panelTop, w - 200, panelH, 32);
  ctx.fill();

  rows.forEach((row, i) => {
    const y = panelTop + 28 + rowH * (i + 0.5);
    ctx.textAlign = "left";
    ctx.fillStyle = i === 0 ? GOLD : MUTED;
    ctx.font = face(800, Math.min(40, rowH * 0.5));
    ctx.fillText(String(row.rank), 140, y);

    ctx.fillStyle = INK;
    const nameSize = fitText(ctx, row.name, w - 480, Math.min(40, rowH * 0.5), 600, 22);
    ctx.font = face(600, nameSize);
    ctx.fillText(row.name, 210, y);

    ctx.textAlign = "right";
    ctx.fillStyle = i === 0 ? ACCENT : MUTED;
    ctx.font = face(700, Math.min(38, rowH * 0.48));
    ctx.fillText(`${row.wins}–${row.losses}`, w - 140, y);
  });
  ctx.textAlign = "center";
}

/* ─────────────────────────── render + share ─────────────────────────── */

export function drawCard(canvas: HTMLCanvasElement, card: ShareCard, shape: ShareShape) {
  const { w, h } = SHAPE_INFO[shape];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawCourt(ctx, w, h);
  ctx.textBaseline = "alphabetic";

  switch (card.kind) {
    case "result": drawResult(ctx, w, h, card); break;
    case "streak": drawStreak(ctx, w, h, card); break;
    case "tournament": drawTournament(ctx, w, h, card); break;
  }

  drawFooter(ctx, w, h);
}

export function cardBlob(card: ShareCard, shape: ShareShape): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, shape);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function cardFilename(card: ShareCard, shape: ShareShape): string {
  const who =
    card.kind === "streak" ? card.stats.name : card.kind === "tournament" ? card.eventName : card.winnerName;
  const safe = who.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "pickleball";
  return `${safe}-${card.kind}-${shape}.png`;
}

/**
 * The caption, written to be pasted. WhatsApp and Instagram both take plain
 * text; Instagram in particular ignores links in a caption, so the URL goes
 * last where it does no harm.
 */
export function cardCaption(card: ShareCard): string {
  switch (card.kind) {
    case "streak": {
      const s = card.stats;
      const lead = s.current >= 2 ? `${s.current} wins in a row 🔥` : streakHeadline(s);
      return `${s.name} — ${lead}\n${s.wins} of ${s.played} played · ${s.winRate}% · best run ${s.best}\n\nScored with PB Card Deck 🏓\npb-card-deck.vercel.app`;
    }
    case "tournament": {
      const top = card.standings
        .slice(0, 3)
        .map((r) => `${r.rank}. ${r.name} (${r.wins}-${r.losses})`)
        .join("\n");
      return `${card.eventName} 🏆\nChampions: ${card.championName}\n\n${top}\n\nRun with PB Card Deck 🏓\npb-card-deck.vercel.app`;
    }
    default:
      return `${card.winnerName} win ${card.score.team1}–${card.score.team2} 🏓${
        card.matchOver ? " — match!" : ""
      }\n\nScored with PB Card Deck\npb-card-deck.vercel.app`;
  }
}

export type ShareOutcome = "shared" | "downloaded" | "failed" | "cancelled";

/**
 * Hand the image to the phone's own share sheet - which is where Instagram
 * and WhatsApp live. A browser that cannot share files downloads it instead,
 * which is the desktop path: save, then post from your phone.
 */
export async function shareCard(card: ShareCard, shape: ShareShape, caption?: string): Promise<ShareOutcome> {
  const blob = await cardBlob(card, shape);
  if (!blob) return "failed";

  const file = new File([blob], cardFilename(card, shape), { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    } catch (err) {
      // A user dismissing the sheet is not a failure.
      return (err as Error)?.name === "AbortError" ? "cancelled" : "failed";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cardFilename(card, shape);
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}

/* Kept so the existing win-screen call site keeps working. */
export type ResultInfo = Omit<ResultCard, "kind">;
export async function shareResult(info: ResultInfo): Promise<"shared" | "downloaded" | "failed"> {
  const out = await shareCard({ kind: "result", ...info }, "post");
  return out === "cancelled" ? "failed" : out;
}
