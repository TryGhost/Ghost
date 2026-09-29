/**
 * One shared once-a-minute clock for every dunning surface.
 *
 * Each `useDunningState` instance used to run its own interval with its own
 * `Date.now()` anchor, so at a phase boundary the banner, the takeover and
 * the layout could disagree for up to a minute. Reading `now` from a single
 * store means every consumer derives the phase from the same reading, and a
 * boundary flips all surfaces in the same render pass.
 *
 * The clock only ticks while at least one consumer retains it, so sessions
 * without dunning in effect carry no interval at all. `retainMinuteTicker`
 * refreshes the reading immediately on the first retention — the stored
 * value may be as old as the module load otherwise.
 */

const TICK_MS = 60_000;

let sharedNow = Date.now();
let interval: ReturnType<typeof setInterval> | null = null;
let retainers = 0;

const listeners = new Set<() => void>();

function tick(): void {
  sharedNow = Date.now();
  listeners.forEach((listener) => listener());
}

/** `useSyncExternalStore` snapshot: the shared clock's last reading. */
export function readSharedNow(): number {
  return sharedNow;
}

/** `useSyncExternalStore` subscription to the shared clock's ticks. */
export function subscribeSharedNow(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps the clock ticking until the returned release is called. The release
 * is idempotent, so an effect cleanup cannot double-decrement the count.
 */
export function retainMinuteTicker(): () => void {
  retainers += 1;
  if (retainers === 1) {
    tick();
    interval = setInterval(tick, TICK_MS);
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;

    retainers -= 1;
    if (retainers === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}
