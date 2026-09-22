import { useEffect } from "react";

/**
 * Freeze the page behind an open sheet or dialog.
 *
 * Without this, scrolling while a sheet is open scrolls the PAGE - the pointer
 * or thumb is over the backdrop, not the sheet - so the content behind drifts
 * and you are somewhere else when the sheet closes.
 *
 * iOS ignores `overflow: hidden` on <body>, so the lock is `position: fixed`
 * on <html> with the scroll offset held in `top`, restored on release. A
 * counter keeps nested dialogs (a sheet that opens another) from unlocking
 * early.
 */
let depth = 0;
let savedY = 0;

function lock() {
  if (depth++ > 0) return;
  savedY = window.scrollY;
  document.documentElement.style.top = `-${savedY}px`;
  document.documentElement.dataset.locked = "true";
}

function release() {
  if (--depth > 0) return;
  depth = 0;
  delete document.documentElement.dataset.locked;
  document.documentElement.style.top = "";
  window.scrollTo(0, savedY);
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return release;
  }, [active]);
}
