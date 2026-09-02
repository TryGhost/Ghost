import { useEffect, useRef } from 'react';

/**
 * Disposes a resource when its owner really goes away. An effect that is torn
 * down and set up again — as StrictMode does — leaves the resource alive,
 * whichever tick the setup lands in.
 */
export function useDeferredDispose(dispose: () => void): void {
  const mounts = useRef(0);

  useEffect(() => {
    mounts.current += 1;

    return () => {
      mounts.current -= 1;
      setTimeout(() => {
        if (mounts.current === 0) {
          dispose();
        }
      });
    };
  }, [dispose]);
}
