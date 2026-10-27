import React, { lazy } from 'react';
// Each exploration's screen-wide CSS, scoped to its view by
// [data-shaping-view] on <html>, so it can restyle any screen
import './exploration-1/exploration.css';
import './exploration-2/exploration.css';

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
  // The exploration this one builds on: it reuses that one's screens and its
  // screen-wide CSS applies here too (data-shaping-family), so a variant
  // only adds what's different
  extends?: string;
}

const exploration1: Exploration = {
  id: 'exploration-1',
  label: 'Exploration 1',
  description: 'Open layouts on Overview and Web traffic.',
  screens: {
    '/analytics': lazy(() => import('./exploration-1/overview')),
    '/analytics/web': lazy(() => import('./exploration-1/web-traffic')),
    '/analytics/newsletters': lazy(() => import('./exploration-1/newsletters')),
  },
};

export const EXPLORATIONS: Exploration[] = [
  exploration1,
  {
    id: 'exploration-2',
    label: 'Exploration 2',
    description: 'Exploration 1 on white surfaces over a warm grey page.',
    screens: exploration1.screens,
    extends: 'exploration-1',
  },
  {
    id: 'exploration-3',
    label: 'Exploration 3',
    description: 'Exploration 1 with Recent posts as an editorial 50/50 on Overview.',
    screens: {
      ...exploration1.screens,
      '/analytics': lazy(() => import('./exploration-3/overview')),
    },
    extends: 'exploration-1',
  },
];
