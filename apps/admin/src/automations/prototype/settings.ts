// PROTOTYPE ONLY (NY-1750): the site conditions the prototype menu (menu.tsx) switches. Don't
// merge this folder.
//
// Shared by both React roots (Admin's and the menu's), so a switch in the menu re-renders the
// screens that read it without a reload. A switch is remembered in this browser; until it's used,
// the site's own setting applies, which keeps tests and other screens on the real behaviour.
import { useEffect, useSyncExternalStore } from 'react';

const STRIPE_KEY = 'prototype.ny1750.stripe';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

// "Stripe connected": null until the menu switches it, then that choice whatever the site's real
// setting is. `siteStripe` is the real setting, reported by the automations screens so the menu
// can show it.
let stripeOverride: boolean | null = (() => {
  try {
    const stored = localStorage.getItem(STRIPE_KEY);
    return stored === null ? null : stored === 'on';
  } catch {
    return null;
  }
})();
let siteStripe = false;

export const setStripeConnected = (connected: boolean) => {
  stripeOverride = connected;
  try {
    localStorage.setItem(STRIPE_KEY, connected ? 'on' : 'off');
  } catch {
    // Storage blocked: the switch still works until the next reload.
  }
  notify();
};

const getStripeConnected = () => stripeOverride ?? siteStripe;

// For the menu: Stripe as the screens see it.
export const usePrototypeStripeConnected = () =>
  useSyncExternalStore(subscribe, getStripeConnected);

// For the automations screens: the site's setting, unless the menu has switched it.
export const useStripeConnectedWithPrototype = (siteStripeEnabled: boolean): boolean => {
  const override = useSyncExternalStore(subscribe, () => stripeOverride);
  useEffect(() => {
    if (siteStripe !== siteStripeEnabled) {
      siteStripe = siteStripeEnabled;
      notify();
    }
  }, [siteStripeEnabled]);
  return override ?? siteStripeEnabled;
};

// How the member page says saving starts or stops a label automation, switched in the prototype
// menu. Hints are plain text: design review (2026-11-10) dropped the icons and bold names, and
// asked for a dialog on Save instead.
// - lines: a hint under Labels, one line per automation
// - sentence: a hint under Labels, one sentence for all of them
// - dialog (default, chosen in design review): no hint; Save asks first
export type HintStyle = 'lines' | 'sentence' | 'dialog';
export const HINT_STYLES: { value: HintStyle; label: string }[] = [
  { value: 'dialog', label: 'Dialog on Save' },
  { value: 'lines', label: 'Hint, one line per automation' },
  { value: 'sentence', label: 'Hint, one sentence' },
];
const HINT_STYLE_KEY = 'prototype.ny1750.hintStyle';

let hintStyle: HintStyle = (() => {
  try {
    const stored = localStorage.getItem(HINT_STYLE_KEY);
    return HINT_STYLES.some((style) => style.value === stored) ? (stored as HintStyle) : 'dialog';
  } catch {
    return 'dialog';
  }
})();

export const setHintStyle = (style: HintStyle) => {
  hintStyle = style;
  try {
    localStorage.setItem(HINT_STYLE_KEY, style);
  } catch {
    // Storage blocked: the choice still works until the next reload.
  }
  notify();
};

export const useHintStyle = () => useSyncExternalStore(subscribe, () => hintStyle);

export const useConfirmLabelChangesOnSave = () => useHintStyle() === 'dialog';

// Clears every prototype setting and the fake lead magnet data in this browser, then reloads so
// nothing kept in memory survives. Automations and labels saved to the site stay.
export const resetPrototype = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('prototype.ny1750.'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage blocked: nothing was kept there.
  }
  window.location.reload();
};
