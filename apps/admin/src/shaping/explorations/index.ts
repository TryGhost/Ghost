import React, { lazy } from 'react';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Explorations: loose, undecided directions, each one a View in the prototype
// menu. An exploration is Planned with some screens swapped for its own
// versions, keyed by route path (without the trailing slash). It can swap one
// screen or several, and its code can do whatever it needs: none of it ships.
//
// To add one: a folder explorations/exploration-<n>/ and an entry below.
// When a direction gets the go-ahead, it's rebuilt in release shape
// (Planned) and its folder and entry are deleted.

export interface Exploration {
  id: string;
  label: string;
  // One line for the menu: what's different
  description: string;
  screens: Record<string, React.LazyExoticComponent<React.FC>>;
}

export const EXPLORATIONS: Exploration[] = [
  {
    id: 'exploration-1',
    label: 'Exploration 1',
    description: 'Web traffic without outlined cards.',
    screens: {
      '/analytics/web': lazy(() => import('./exploration-1/web-traffic')),
    },
  },
];
