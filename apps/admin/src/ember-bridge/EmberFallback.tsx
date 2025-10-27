import { useEffect } from 'react';
import { useEmberContext } from './EmberContext';


/**
 * EmberFallback component that registers itself with the EmberContext.
 * When this component is mounted, it signals that the Ember app should be shown.
 * When unmounted, it unregisters itself.
 */
export function EmberFallback() {
  const { registerFallback, unregisterFallback } = useEmberContext();

  useEffect(() => {
    registerFallback();
    return () => {
      unregisterFallback();
    };
  }, [registerFallback, unregisterFallback]);

  return null;
}
