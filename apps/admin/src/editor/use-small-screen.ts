import { useSyncExternalStore } from 'react';

/** Below Tailwind's `sm` breakpoint, where its `max-sm:` utilities apply. */
const SMALL_SCREEN = '(width < 40rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether the screen is below the small breakpoint, kept in step with `max-sm:` styles. */
export function useSmallScreen() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(SMALL_SCREEN).matches);
}
