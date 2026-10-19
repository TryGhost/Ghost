import { useSyncExternalStore } from 'react';

// Design options to compare side by side, picked in the prototype menu
// (Explorations). Unlike the mock switches, a change applies live: the screen
// re-renders, no reload.

export const EMAIL_CARD_VARIANTS = [
  { id: 'current', label: 'A. Current build' },
  { id: 'content-switch', label: 'B. Content switch' },
] as const;

export type EmailCardVariant = (typeof EMAIL_CARD_VARIANTS)[number]['id'];

const EMAIL_CARD_KEY = 'shaping.variant.emailCard';
const CHANGE_EVENT = 'shaping:variant-change';

const readEmailCardVariant = (): EmailCardVariant => {
  try {
    const stored = localStorage.getItem(EMAIL_CARD_KEY);
    return EMAIL_CARD_VARIANTS.find((variant) => variant.id === stored)?.id ?? 'current';
  } catch {
    return 'current';
  }
};

export const setEmailCardVariant = (variant: EmailCardVariant) => {
  try {
    localStorage.setItem(EMAIL_CARD_KEY, variant);
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

export const useEmailCardVariant = () => useSyncExternalStore(subscribe, readEmailCardVariant);
