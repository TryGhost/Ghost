import { type ComponentType, useEffect, useState } from 'react';

type ComponentModule<P> = { default: ComponentType<P> };

const loadedComponents = new WeakMap<() => Promise<unknown>, ComponentType<never>>();

/**
 * Loads a component's module without suspending, so a navigation elsewhere is
 * never held back while it loads; returns null until it has. `load` must be a
 * module-level function, which also caches the result for later mounts.
 */
export function useLazyComponent<P>(
  load: () => Promise<ComponentModule<P>>,
): ComponentType<P> | null {
  const [component, setComponent] = useState<ComponentType<P> | null>(
    () => (loadedComponents.get(load) as ComponentType<P> | undefined) ?? null,
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (component) {
      return;
    }
    let active = true;
    load().then(
      (module) => {
        loadedComponents.set(load, module.default as ComponentType<never>);
        if (active) {
          setComponent(() => module.default);
        }
      },
      (loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [component, load]);

  if (error) {
    throw error;
  }
  return component;
}
