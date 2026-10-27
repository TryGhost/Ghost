import { useSyncExternalStore } from 'react';
import { EXPLORATIONS } from './explorations';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// What the prototype shows, picked from the menu's one View list:
//
// - Planned: the release-shaped work, the slices in the release plan
// - Exploration 1, 2…: Planned with some screens swapped (see explorations/)
// - Patterns: every building block on one page, under any /analytics screen
// - Today: as it ships now (the Admin 7 analytics flag off)
//
// Every view but Today sets `data-admin7-analytics` on <html>, standing in
// for the Labs flag; the restyled pieces read it (Shade's `useRootFlag` and
// the `admin7-analytics:` variant). Remembered in this browser, applied live.

export interface ViewOption {
  id: string;
  label: string;
  description: string;
}

export const VIEWS: ViewOption[] = [
  { id: 'planned', label: 'Planned', description: 'The release-shaped work in the release plan.' },
  ...EXPLORATIONS.map(({ id, label, description }) => ({ id, label, description })),
  {
    id: 'patterns',
    label: 'Patterns',
    description: 'Every building block on one page, with sample data.',
  },
  { id: 'today', label: 'Today', description: 'Analytics as it ships now.' },
];

const DEFAULT_VIEW = 'planned';
const VIEW_KEY = 'shaping.analytics.view';
const ATTRIBUTE = 'data-admin7-analytics';
const VIEW_ATTRIBUTE = 'data-shaping-view';
const FAMILY_ATTRIBUTE = 'data-shaping-family';
const CHANGE_EVENT = 'shaping:view-change';

const readView = (): string => {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    return VIEWS.some((view) => view.id === stored) && stored ? stored : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
};

const apply = (view: string) => {
  document.documentElement.toggleAttribute(ATTRIBUTE, view !== 'today');
  // Lets an exploration's CSS restyle any screen (see explorations/)
  document.documentElement.setAttribute(VIEW_ATTRIBUTE, view);
  // The view and the exploration it builds on, if any, so the base's CSS
  // applies to it too ([data-shaping-family~='exploration-1'])
  const base = EXPLORATIONS.find((exploration) => exploration.id === view)?.extends;
  document.documentElement.setAttribute(FAMILY_ATTRIBUTE, base ? `${view} ${base}` : view);
};

// Called from main.tsx before Admin renders
export const applyView = () => apply(readView());

export const setView = (view: string) => {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage blocked: the change still applies until the page reloads.
  }
  apply(view);
  // The patterns page lives under Analytics; take the screen there.
  if (view === 'patterns' && !window.location.hash.startsWith('#/analytics')) {
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

export const useView = () => useSyncExternalStore(subscribe, readView);
