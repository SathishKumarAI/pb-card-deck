"use client";

/**
 * Keeps the screen awake while `active`, so a phone propped courtside does not
 * dim mid-match (backlog F188). Re-acquires when the tab returns to the
 * foreground; releases on false or unmount. No-op where wakeLock is missing.
 */

import { useEffect } from "react";

type SentinelLike = { release: () => Promise<void> };

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sentinel: SentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<SentinelLike> };
    };
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          sentinel = await nav.wakeLock.request("screen");
          if (cancelled) { sentinel.release().catch(() => {}); sentinel = null; }
        }
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
