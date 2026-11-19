import type { Clock } from '@tryghost/kernel/clock';

/**
 * Builds the clock a process has: the system time. Code that needs the time
 * is handed this, so the kernel's date helpers stay pure and a test can hand
 * in another one.
 */
export function createClock(): Clock {
  return { now: () => Date.now() };
}
