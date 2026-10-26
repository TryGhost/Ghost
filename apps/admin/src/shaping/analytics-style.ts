import { useSyncExternalStore } from 'react';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Stands in for the Admin 7 Analytics Labs flag: sets `data-admin7-analytics`
// on <html>, which the restyled pieces read (Shade's `useRootFlag` and scoped
// CSS). On by default, switched in the prototype menu, remembered in this
// browser, applied live. In the real PR, Admin sets the same attribute in one
// place from `useFeatureFlag('admin7Analytics')`.

const STYLE_KEY = 'shaping.analytics.style';
const ATTRIBUTE = 'data-admin7-analytics';

const readAnalyticsStyle = (): boolean => {
  try {
    return localStorage.getItem(STYLE_KEY) !== 'off';
  } catch {
    return true;
  }
};

const apply = (on: boolean) => {
  document.documentElement.toggleAttribute(ATTRIBUTE, on);
};

// Called from main.tsx before Admin renders
export const applyAnalyticsStyle = () => apply(readAnalyticsStyle());

export const setAnalyticsStyle = (on: boolean) => {
  try {
    localStorage.setItem(STYLE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the change still applies until the page reloads.
  }
  apply(on);
};

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: [ATTRIBUTE] });
  return () => observer.disconnect();
};

export const useAnalyticsStyle = () =>
  useSyncExternalStore(subscribe, () => document.documentElement.hasAttribute(ATTRIBUTE));
