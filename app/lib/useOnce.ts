"use client";

/**
 * A one-time UI gate backed by localStorage: the welcome tour, the beginner
 * intro, the first-game hint. `show` is true until `dismiss` is called once,
 * ever, on this device.
 *
 * `when` defers the check - the game hint waits until a game is open.
 */

import { useCallback, useEffect, useState } from "react";

export function useOnce(key: string, when = true) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!when) return;
    try {
      if (!localStorage.getItem(key)) setShow(true);
    } catch {}
  }, [key, when]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(key, "1"); } catch {}
    setShow(false);
  }, [key]);

  // Replay ignores the stored flag - "show me that again" from a menu.
  const replay = useCallback(() => setShow(true), []);

  return { show, dismiss, replay };
}
