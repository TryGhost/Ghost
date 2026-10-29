import { useEffect, useMemo, useRef } from 'react';

export interface MinimumDuration {
  /** Marks the moment the running state appeared, restarting the minimum for pending waits too. */
  start: () => void;
  /** Resolves once the minimum has passed since the latest `start()`; at once if it already has, never started, or unmounted. */
  elapsed: () => Promise<void>;
}

/**
 * Keeps a running state, such as a spinner, on screen for at least `ms`
 * however quickly the work behind it finishes: call `start()` as it appears
 * and await `elapsed()` before moving on. Once unmounted, every pending or
 * later `elapsed()` settles at once, so a torn-down caller is never left
 * waiting and must check it is still live before acting.
 */
export function useMinimumDuration(ms: number): MinimumDuration {
  const startedAtRef = useRef<number | null>(null);
  const waitsRef = useRef(new Map<() => void, ReturnType<typeof setTimeout>>());
  const unmountedRef = useRef(false);

  useEffect(() => {
    const waits = waitsRef.current;
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      for (const [settle, timer] of waits) {
        clearTimeout(timer);
        settle();
      }
      waits.clear();
    };
  }, []);

  return useMemo(() => {
    // Settles a wait once the minimum has passed since the latest start, replacing any earlier timer.
    const schedule = (settle: () => void) => {
      const waits = waitsRef.current;
      const startedAt = startedAtRef.current;
      const remaining =
        unmountedRef.current || startedAt === null ? 0 : startedAt + ms - Date.now();

      clearTimeout(waits.get(settle));

      if (remaining <= 0) {
        waits.delete(settle);
        settle();
        return;
      }

      waits.set(
        settle,
        setTimeout(() => {
          waits.delete(settle);
          settle();
        }, remaining),
      );
    };

    return {
      start: () => {
        startedAtRef.current = Date.now();
        [...waitsRef.current.keys()].forEach(schedule);
      },
      elapsed: () =>
        new Promise<void>((resolve) => {
          schedule(resolve);
        }),
    };
  }, [ms]);
}
