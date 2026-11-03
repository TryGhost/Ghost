import { useSyncExternalStore } from 'react';

// Design options to compare side by side, picked in the prototype menu
// (Explorations). Unlike the mock switches, a change applies live: the screen
// re-renders, no reload.

// The automation editor's chrome. Current build is main's left-hand sidebar; the
// other two are from the 1498 proto: Docked is the phase-2/5 lanes' header bar and
// full-height sidebar, Floating is the GA lane's controls over a full-screen canvas,
// with the sidebar as an inset card.
export const EDITOR_CHROME_VARIANTS = [
  { id: 'current', label: 'A. Current build' },
  { id: 'docked', label: 'B. Docked' },
  { id: 'floating', label: 'C. Floating' },
] as const;

export type EditorChromeVariant = (typeof EDITOR_CHROME_VARIANTS)[number]['id'];

const EDITOR_CHROME_KEY = 'shaping.variant.editorChrome';
const CHANGE_EVENT = 'shaping:variant-change';

const readEditorChromeVariant = (): EditorChromeVariant => {
  try {
    const stored = localStorage.getItem(EDITOR_CHROME_KEY);
    return EDITOR_CHROME_VARIANTS.find((variant) => variant.id === stored)?.id ?? 'current';
  } catch {
    return 'current';
  }
};

export const setEditorChromeVariant = (variant: EditorChromeVariant) => {
  try {
    localStorage.setItem(EDITOR_CHROME_KEY, variant);
  } catch {
    // Storage blocked: the change still applies until the page reloads.
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

export const useEditorChromeVariant = () =>
  useSyncExternalStore(subscribe, readEditorChromeVariant);
