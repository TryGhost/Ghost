export const ACTIVE_INTERVAL_MS = 10_000;
export const IDLE_INTERVAL_MS = 30_000;
/** No input for this long switches to the idle cadence. */
export const IDLE_AFTER_MS = 60_000;
/** No input for this long stops polling until the next input. */
export const STOP_AFTER_MS = 30 * 60_000;
export const MAX_BACKOFF_MS = 60_000;

export type PauseReason = 'hidden' | 'idle' | 'unsupported' | 'disposed';

export interface ActivityPollerOptions {
  /** true when served, false to stop for good, undefined to skip without touching backoff. */
  poll: (isCurrent: () => boolean) => Promise<boolean | undefined>;
  onPause: (reason: PauseReason) => void;
  document?: Document;
  now?: () => number;
}

/** Polls while the tab is visible, every 10 s with input and every 30 s without, one request at a time. */
export function startActivityPoller({
  poll,
  onPause,
  document: target = document,
  now = Date.now,
}: ActivityPollerOptions) {
  let disposed = false;
  let disabled = false;
  let active = false;
  let inFlight = false;
  let generation = 0;
  let lastInteraction = now();
  let failures = 0;
  let nextPoll: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  const idleFor = () => now() - lastInteraction;
  const eligible = () => !disposed && !disabled && !target.hidden && idleFor() < STOP_AFTER_MS;
  const interval = () => (idleFor() < IDLE_AFTER_MS ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS);

  function pause(reason: PauseReason) {
    const wasActive = active;
    active = false;
    generation += 1;
    clearTimeout(nextPoll);
    clearTimeout(stopTimer);
    if (wasActive) {
      onPause(reason);
    }
  }

  async function run() {
    if (!eligible() || inFlight) {
      return;
    }
    inFlight = true;
    const requestGeneration = generation;
    const isCurrent = () => eligible() && requestGeneration === generation;
    try {
      const served = await poll(isCurrent);
      if (served === false && !disposed) {
        disabled = true;
        pause('unsupported');
      }
      if (served === true) {
        failures = 0;
      }
    } catch {
      if (isCurrent()) {
        failures += 1;
      }
    } finally {
      inFlight = false;
      if (active && eligible()) {
        // Poll at once when the tab became active again during this request.
        const delay =
          requestGeneration !== generation
            ? 0
            : Math.min(interval() * 2 ** failures, MAX_BACKOFF_MS);
        nextPoll = setTimeout(() => void run(), delay);
      }
    }
  }

  function scheduleStop() {
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      if (eligible()) {
        scheduleStop();
      } else {
        pause('idle');
      }
    }, STOP_AFTER_MS - idleFor());
  }

  function interact() {
    if (disposed || disabled || target.hidden) {
      return;
    }
    // Pointer moves arrive constantly; one timestamp update a second is enough.
    if (active && idleFor() < 1000) {
      return;
    }
    lastInteraction = now();
    if (!active) {
      active = true;
      failures = 0;
      clearTimeout(nextPoll);
      scheduleStop();
      void run();
    }
  }

  function visibilityChanged() {
    if (target.hidden) {
      pause('hidden');
    } else {
      interact();
    }
  }

  const events = ['keydown', 'pointerdown', 'pointermove', 'scroll', 'touchstart'];
  for (const event of events) {
    target.addEventListener(event, interact, { passive: true, capture: true });
  }
  target.addEventListener('visibilitychange', visibilityChanged);
  interact();

  return () => {
    disposed = true;
    pause('disposed');
    for (const event of events) {
      target.removeEventListener(event, interact, true);
    }
    target.removeEventListener('visibilitychange', visibilityChanged);
  };
}
