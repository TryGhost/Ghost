export const ACTIVE_INTERVAL_MS = 10_000;
export const IDLE_INTERVAL_MS = 30_000;
/** No input for this long switches to the idle cadence. */
export const IDLE_AFTER_MS = 60_000;
/** No input for this long stops polling until the next input. */
export const STOP_AFTER_MS = 30 * 60_000;
export const MAX_BACKOFF_MS = 60_000;
/** A missing endpoint may be a flag that has not reached this server process yet; ask again this often. */
export const UNSUPPORTED_RETRY_MS = 5 * 60_000;

export type PauseReason = 'hidden' | 'idle' | 'unsupported' | 'disposed';

export interface ActivityPollerOptions {
  /** true when served, false when the endpoint is not there, undefined to skip without touching backoff. */
  poll: (isCurrent: () => boolean) => Promise<boolean | undefined>;
  onPause: (reason: PauseReason) => void;
  /** Keeps polling at the idle cadence while the tab is hidden, for a caller whose place must outlast a tab switch. */
  keepAliveWhileHidden?: boolean;
  document?: Document;
  now?: () => number;
}

export interface ActivityPoller {
  stop: () => void;
  /** Polls at once, or as soon as the request in flight has answered. */
  pollNow: () => void;
}

/** Polls while the tab is visible, every 10 s with input and every 30 s without, one request at a time. */
export function startActivityPoller({
  poll,
  onPause,
  keepAliveWhileHidden = false,
  document: target = document,
  now = Date.now,
}: ActivityPollerOptions): ActivityPoller {
  let disposed = false;
  let retryAt = 0;
  let active = false;
  let inFlight = false;
  let again = false;
  let generation = 0;
  let lastInteraction = now();
  let failures = 0;
  let nextPoll: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const idleFor = () => now() - lastInteraction;
  const away = () => target.hidden && !keepAliveWhileHidden;
  const eligible = () => !disposed && now() >= retryAt && !away() && idleFor() < STOP_AFTER_MS;
  const interval = () =>
    !target.hidden && idleFor() < IDLE_AFTER_MS ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;

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
    again = false;
    const requestGeneration = generation;
    const isCurrent = () => eligible() && requestGeneration === generation;
    try {
      const served = await poll(isCurrent);
      if (served === false && !disposed) {
        // Input must not ask sooner, or an older backend would get a request per keystroke.
        retryAt = now() + UNSUPPORTED_RETRY_MS;
        pause('unsupported');
        clearTimeout(retryTimer);
        retryTimer = setTimeout(resume, UNSUPPORTED_RETRY_MS);
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
        // Poll at once when the tab became active again, or a poll was asked for, during this request.
        const delay =
          requestGeneration !== generation || again
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

  function resume() {
    if (active || !eligible()) {
      return;
    }
    active = true;
    failures = 0;
    clearTimeout(nextPoll);
    scheduleStop();
    void run();
  }

  function interact() {
    if (disposed || target.hidden) {
      return;
    }
    // Pointer moves arrive constantly; one timestamp update a second is enough.
    if (active && idleFor() < 1000) {
      return;
    }
    lastInteraction = now();
    resume();
  }

  function pollNow() {
    if (!active || !eligible()) {
      return;
    }
    if (inFlight) {
      again = true;
      return;
    }
    clearTimeout(nextPoll);
    void run();
  }

  function visibilityChanged() {
    if (away()) {
      pause('hidden');
    } else if (!target.hidden) {
      const wasActive = active;
      interact();
      // A tab that kept polling while hidden asks at once what changed while the writer was away.
      if (wasActive) {
        pollNow();
      }
    }
  }

  // A closing or reloading page gives its place up; one that keeps polling while hidden would otherwise hold it.
  function pageHidden() {
    pause('hidden');
  }

  // A page restored from the back/forward cache was paused by its pagehide.
  function pageShown() {
    if (!target.hidden) {
      interact();
    }
  }

  const events = ['keydown', 'pointerdown', 'pointermove', 'scroll', 'touchstart'];
  for (const event of events) {
    target.addEventListener(event, interact, { passive: true, capture: true });
  }
  target.addEventListener('visibilitychange', visibilityChanged);
  const view = target.defaultView;
  view?.addEventListener('pagehide', pageHidden);
  view?.addEventListener('pageshow', pageShown);
  interact();

  const stop = () => {
    disposed = true;
    clearTimeout(retryTimer);
    pause('disposed');
    for (const event of events) {
      target.removeEventListener(event, interact, true);
    }
    target.removeEventListener('visibilitychange', visibilityChanged);
    view?.removeEventListener('pagehide', pageHidden);
    view?.removeEventListener('pageshow', pageShown);
  };
  return { stop, pollNow };
}
