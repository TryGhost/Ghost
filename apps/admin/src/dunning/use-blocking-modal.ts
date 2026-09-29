import { useSyncExternalStore } from 'react';

// Match the Shade and legacy modal markers used by Settings. The dunning
// takeover itself has neither marker, so it cannot suppress itself.
const MODAL_SELECTOR =
  '#modal-backdrop, :is([role="dialog"], [role="alertdialog"])[data-state="open"]';

function hasBlockingModal(): boolean {
  // Radix retains its pointer lock through a dialog's exit animation. Wait for
  // that lock to release as well as for the dialog to close.
  return (
    document.body.style.pointerEvents === 'none' || Boolean(document.querySelector(MODAL_SELECTOR))
  );
}

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(() => {
      listeners.forEach((notify) => notify());
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'role', 'id', 'style'],
    });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const subscribeDisabled = () => () => {};
const readDisabled = () => false;

/** Share one observer across the layout, banner and overlay, only while locked. */
export function useBlockingModal(enabled: boolean): boolean {
  return useSyncExternalStore(
    enabled ? subscribe : subscribeDisabled,
    enabled ? hasBlockingModal : readDisabled,
  );
}
