import { useLayoutEffect } from 'react';
import { useEmberContext } from './ember-context';

/**
 * EmberFallback component that registers itself with the EmberContext.
 * When this component is mounted, it signals that the Ember app should be shown.
 * When unmounted, it unregisters itself.
 */
export function EmberFallback() {
  const { registerFallback, unregisterFallback } = useEmberContext();

  // Registered before paint: the Ember app must show in the same frame that removes React's screen.
  useLayoutEffect(() => {
    registerFallback();
    return () => {
      unregisterFallback();
    };
  }, [registerFallback, unregisterFallback]);

  return null;
}
