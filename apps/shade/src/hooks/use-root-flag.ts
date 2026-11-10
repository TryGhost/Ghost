import { useSyncExternalStore } from 'react';

// ANALYTICS PROTOTYPE: whether a root attribute is on, e.g.
// `useRootFlag('analytics-proto')` reads `data-analytics-proto` on <html>.
// The shaping menu sets it for every view but Today, so the prototype's
// analytics pieces can be compared with main's. Re-renders live when the
// attribute changes.
//
// Real (release-shaped) work reads main's switch instead:
// `useShade().admin7Design`, from the admin7Design Labs flag.

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
