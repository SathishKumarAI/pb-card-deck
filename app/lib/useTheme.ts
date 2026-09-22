"use client";

/**
 * Owns the theme choice and everything that follows from it: the `data-theme`
 * attribute, the browser-chrome `theme-color`, and persistence.
 *
 * Does NOT own any component's colours - those are tokens in globals.css.
 */

import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "auto";

const KEY = "pb-theme";
/* Must match --bg for each theme, or the browser chrome fights the page. */
const CHROME = { dark: "#0b0e0f", light: "#eef3f1" };

export function useTheme() {
  /* Light by default. Anyone who prefers dark switches once and the choice is
     remembered; "auto" follows the device. */
  const [theme, setTheme] = useState<Theme>("light");
  const [systemDark, setSystemDark] = useState(false);
  const darkMode = theme === "auto" ? systemDark : theme === "dark";
  const cycleTheme = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "auto" : "light")),
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", darkMode ? CHROME.dark : CHROME.light);
  }, [darkMode]);

  // Load once, then follow the system while set to "auto" (backlog F201).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "dark" || saved === "light" || saved === "auto") setTheme(saved);
    } catch {}
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  return { theme, darkMode, cycleTheme };
}
