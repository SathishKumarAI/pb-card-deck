/**
 * Colour audit: WCAG contrast for every text/surface pair the app actually
 * renders, read straight out of app/globals.css.
 *
 * Run: node scripts/contrast-audit.mjs
 *
 * Why a script and not an eyeball: "looks fine on my monitor" is how a light
 * theme ships with 3:1 body text. Thresholds are WCAG 2.1 AA - 4.5 for body
 * text, 3.0 for large text (>=24px or >=19px bold) and for UI boundaries.
 *
 * Exits non-zero if any pair marked required fails, so CI can hold the line.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");

/* ── read the token blocks ────────────────────────────────────────────── */

function tokensIn(selector) {
  // Find the selector only where it OPENS A RULE at the start of a line.
  // Searching the raw text matched the selector inside a comment that mentions
  // it, and silently read the neighbouring theme's tokens instead - which is
  // why both themes first reported identical, suspiciously good numbers.
  const needle = `\n${selector} {`;
  const at = css.indexOf(needle);
  if (at === -1) throw new Error(`selector not found at line start: ${selector}`);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const out = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const light = tokensIn(":root, [data-theme=\"light\"]");
const dark = tokensIn("[data-theme=\"dark\"]");

/* ── colour maths ─────────────────────────────────────────────────────── */

function parse(colour) {
  const hex = colour.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = colour.match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((p) => parseFloat(p.trim()));
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  }
  return null;
}

/** Flatten a translucent colour over a backdrop, the way the browser does. */
function over(fg, bg) {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1);
}

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fgColour, bgColour, pageColour) {
  const page = parse(pageColour);
  let bg = parse(bgColour);
  if (!bg || !page) return null;
  if (bg[3] < 1) bg = over(bg, page);
  let fg = parse(fgColour);
  if (!fg) return null;
  if (fg[3] < 1) fg = over(fg, bg);
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* ── the pairs the app really renders ─────────────────────────────────── */

const PAIRS = [
  // [foreground token, background token, minimum, what it is]
  ["--text", "--bg", 4.5, "body text on the page"],
  ["--text", "--bg-card", 4.5, "body text on a card"],
  ["--text", "--bg-elevated", 4.5, "body text on an elevated control"],
  ["--text-secondary", "--bg", 4.5, "secondary text on the page"],
  ["--text-secondary", "--bg-card", 4.5, "secondary text on a card"],
  ["--text-muted", "--bg", 3.0, "muted label on the page (large/label use)"],
  ["--text-muted", "--bg-card", 3.0, "muted label on a card"],
  ["--accent", "--bg", 3.0, "accent text/icon on the page"],
  ["--accent", "--bg-card", 3.0, "accent on a card"],
  ["--accent-ink", "--accent", 4.5, "text on an accent button"],
  ["--yellow", "--bg", 3.0, "serve marker on the page"],
  ["--yellow", "--bg-card", 3.0, "serve marker on a card"],
  ["--red", "--bg-card", 3.0, "destructive text on a card"],
  ["--blue", "--bg-card", 3.0, "team 1 marker on a card"],
  // Advisory (min 0): a card border is decoration - the surface itself is what
  // separates content. Printed so a palette change cannot make it invisible
  // without someone noticing.
  ["--border", "--bg-card", 0, "hairline against a card (advisory)"],
  ["--mat-edge", "--bg-card", 0, "glass edge against a card (advisory)"],
];

const THEMES = [
  ["light", light],
  ["dark", { ...light, ...dark }], // dark overrides light
];

let failures = 0;
for (const [name, tokens] of THEMES) {
  console.log(`\n${name.toUpperCase()}  (page = ${tokens["--bg"]})`);
  for (const [fg, bg, min, label] of PAIRS) {
    const r = ratio(tokens[fg], tokens[bg], tokens["--bg"]);
    if (r == null) {
      console.log(`  ?      ${label}  (${fg} on ${bg}: unparseable)`);
      continue;
    }
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)} : ${String(min).padEnd(4)} ${label}`,
    );
  }
}

console.log(`\n${failures === 0 ? "All pairs meet their threshold." : `${failures} pair(s) below threshold.`}`);
process.exit(failures === 0 ? 0 : 1);
