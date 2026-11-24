import { useSyncExternalStore } from 'react';

/**
 * The prototype's on/off switch. It lives in localStorage so no labs flag or
 * server change is needed. `?auth-prototype=on` / `?auth-prototype=off` on any
 * Admin URL (before or after the `#`) flips it.
 */
const STORAGE_KEY = 'ghost-auth-prototype';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

let enabled = read();

function write(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, 'on');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the switch only lasts for this page load.
  }
  if (enabled !== value) {
    enabled = value;
    listeners.forEach((listener) => listener());
  }
}

export function isAuthPrototypeEnabled(): boolean {
  return enabled;
}

export function enableAuthPrototype() {
  write(true);
}

export function disableAuthPrototype() {
  write(false);
}

function applyUrlSwitch() {
  const queries = [window.location.search, window.location.hash.split('?')[1] ?? ''];
  for (const query of queries) {
    const value = new URLSearchParams(query).get('auth-prototype');
    if (value === 'on') {
      write(true);
    } else if (value === 'off') {
      write(false);
    }
  }
}

if (typeof window !== 'undefined') {
  applyUrlSwitch();
  window.addEventListener('hashchange', applyUrlSwitch);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders when the prototype is switched on or off. */
export function useAuthPrototypeEnabled(): boolean {
  return useSyncExternalStore(subscribe, isAuthPrototypeEnabled, () => false);
}
