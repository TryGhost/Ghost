import { useEffect, useMemo, useRef } from 'react';

export interface MinimumDuration {
  /** Marks the moment the running state appeared, restarting the minimum. */
  start: () => void;
  /** Resolves once the minimum has passed since `start()`; at once if it already has, or never started. */
  elapsed: () => Promise<void>;
}

/**
 * Keeps a running state, such as a spinner, on screen for at least `ms`
 * however quickly the work behind it finishes: call `start()` as it appears
 * and await `elapsed()` before moving on. Unmounting settles every pending
 * `elapsed()` at once, so a torn-down caller is never left waiting and must
 * check it is still live before acting.
 */
export function useMinimumDuration(ms: number): MinimumDuration {
  const startedAtRef = useRef<number | null>(null);
  const pendingRef = useRef(new Set<() => void>());

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      [...pending].forEach((release) => release());
    };
  }, []);

  return useMemo(
    () => ({
      start: () => {
        startedAtRef.current = Date.now();
      },
      elapsed: () =>
        new Promise<void>((resolve) => {
          const startedAt = startedAtRef.current;
          const remaining = startedAt === null ? 0 : startedAt + ms - Date.now();

          if (remaining <= 0) {
            resolve();
            return;
          }

          const release = () => {
            clearTimeout(timer);
            pendingRef.current.delete(release);
            resolve();
          };
          const timer = setTimeout(release, remaining);
          pendingRef.current.add(release);
        }),
    }),
    [ms],
  );
}
