import { useSyncExternalStore } from 'react';

// ANALYTICS PROTOTYPE: whether a milestone's root attribute is on, e.g.
// `useRootFlag('admin7-analytics')` reads `data-admin7-analytics` on <html>.
// The app sets the attribute in one place from its feature flag; shared
// components read it here, and scoped CSS can use the same attribute.
// Re-renders live when the attribute changes.
//
// Open question for the real PR: Admin 7 milestones normally reach Shade
// through ShadeApp's `isAdmin7`, but that switch now stays on for the
// generally available pill controls, so it can't gate a new milestone.

const attributeName = (name: string) => `data-${name}`;

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
};

export const useRootFlag = (name: string) =>
  useSyncExternalStore(
    subscribe,
    () => document.documentElement.hasAttribute(attributeName(name)),
    () => false,
  );
