import { useSyncExternalStore } from 'react';

// Whether Analytics shows its screens or the patterns page, picked in the
// prototype menu. Remembered in this browser; a change applies live, with no
// reload.
//
// Not a URL parameter: Admin's dev server only serves Admin at exactly
// `/ghost/` (its screens live after the `#`), so `/ghost/?patterns` is handed
// to Ghost itself, which has no built Admin in development and errors.

const PATTERNS_KEY = 'shaping.analytics.patterns';
const CHANGE_EVENT = 'shaping:patterns-change';

const readPatternsView = (): boolean => {
  try {
    return localStorage.getItem(PATTERNS_KEY) === 'on';
  } catch {
    return false;
  }
};

export const setPatternsView = (on: boolean) => {
  try {
    localStorage.setItem(PATTERNS_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the change still applies until the page reloads.
  }
  // The patterns page lives under Analytics; take the screen there.
  if (on && !window.location.hash.startsWith('#/analytics')) {
    window.location.hash = '#/analytics/';
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

export const usePatternsView = () => useSyncExternalStore(subscribe, readPatternsView);
