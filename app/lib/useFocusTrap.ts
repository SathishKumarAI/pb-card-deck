import { RefObject, useEffect } from "react";

// Keep keyboard focus inside an open dialog and restore it on close (backlog
// F232). Esc fires onEscape. The container should have tabIndex={-1} so it can
// receive focus when it has no focusable children yet.
const SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => el.offsetParent !== null);

    // Focus the dialog's primary action if it marks itself, else the first
    // focusable child. Without the opt-out, opening a dialog always ringed
    // whatever came first in the DOM - usually "Skip" or a close button, which
    // reads as the default answer.
    const preferred = node.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? focusable()[0] ?? node).focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [active, ref, onEscape]);
}
