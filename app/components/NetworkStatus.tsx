"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";

/**
 * Two self-contained, app-wide notices (backlog F228 + F345):
 *  - Offline banner: shown whenever the device loses connectivity. The app still
 *    works offline (service worker), so this is reassurance, not an error.
 *  - Update-ready prompt: shown when a new service worker has installed over an
 *    existing one, offering a one-tap reload to pick up the new version.
 *
 * Mounted once in the root layout so it covers every screen without touching the
 * game page's state.
 */
export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  // Connectivity.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Service-worker update detection. Only fires when a controller already exists
  // (i.e. a real update, not the first install).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker.ready
      .then((r) => {
        reg = r;
        r.addEventListener("updatefound", () => {
          const sw = r.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      reg = undefined;
    };
  }, []);

  if (!offline && !updateReady) return null;

  return (
    <div
      className="fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      role="status"
      aria-live="polite"
    >
      {offline && (
        <div
          className="flex w-full max-w-sm items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-lg backdrop-blur"
          style={{ background: "var(--glass)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <WifiOff size={16} style={{ color: "var(--yellow)" }} aria-hidden />
          <span>Offline - the app keeps working. Scores save on this device.</span>
        </div>
      )}

      {updateReady && (
        <div
          className="flex w-full max-w-sm items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-lg backdrop-blur"
          style={{ background: "var(--glass)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={16} style={{ color: "var(--accent)" }} aria-hidden />
          <span className="flex-1">A new version is ready.</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "#04150f" }}
          >
            Reload
          </button>
          <button
            onClick={() => setUpdateReady(false)}
            aria-label="Dismiss update notice"
            className="rounded-lg p-1"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
