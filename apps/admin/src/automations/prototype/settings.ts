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
