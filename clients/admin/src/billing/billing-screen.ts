import { useSyncExternalStore } from 'react';

let screenOpen = false;
const listeners = new Set<() => void>();

/** Set by the `/pro/*` route while it admits the user to the billing screen. */
export function setBillingScreenOpen(open: boolean): void {
  if (open !== screenOpen) {
    screenOpen = open;
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return screenOpen;
}

/** Whether the billing screen is showing, i.e. the persistent frame is visible. */
export function useBillingScreenOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
