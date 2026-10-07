export const POLL_INTERVAL_MS = 10000;
export const IDLE_TIMEOUT_MS = 60000;

/** Poll while the tab is visible and active, with one request at a time. */
export function startActivityPoller({
  poll,
  clear,
  document: target = document,
  now = Date.now,
}: {
  // false stops polling; undefined skips a request without clearing backoff.
  poll: (isCurrent: () => boolean) => Promise<boolean | undefined>;
  clear: () => void;
  document?: Document;
  now?: () => number;
}) {
  let disposed = false;
  let disabled = false;
  let active = false;
  let inFlight = false;
  let generation = 0;
  let lastInteraction = now();
  let failures = 0;
  let nextPoll: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const eligible = () =>
    !disposed && !disabled && !target.hidden && now() - lastInteraction < IDLE_TIMEOUT_MS;

  function pause() {
    active = false;
    generation += 1;
    clearTimeout(nextPoll);
    clearTimeout(idleTimer);
    clear();
  }

  async function run() {
    if (!eligible() || inFlight) {
      return;
    }
    inFlight = true;
    const requestGeneration = generation;
    const isCurrent = () => eligible() && requestGeneration === generation;
    try {
      const supported = await poll(isCurrent);
      if (supported === false && !disposed) {
        disabled = true;
        pause();
      }
      if (supported === true) {
        failures = 0;
      }
    } catch {
      if (isCurrent()) {
        clear();
        failures += 1;
      }
    } finally {
      inFlight = false;
      if (eligible()) {
        // Poll immediately if the tab became active again during this request.
        const delay =
          requestGeneration !== generation
            ? 0
            : Math.min(POLL_INTERVAL_MS * 2 ** failures, IDLE_TIMEOUT_MS);
        nextPoll = setTimeout(() => void run(), delay);
      }
    }
  }

  function checkIdle() {
    if (!eligible()) {
      pause();
      return;
    }
    idleTimer = setTimeout(checkIdle, IDLE_TIMEOUT_MS - (now() - lastInteraction));
  }

  function interact() {
    if (disposed || disabled || target.hidden) {
      return;
    }
    // Update activity at most once a second while polling.
    if (active && now() - lastInteraction < 1000) {
      return;
    }
    lastInteraction = now();
    if (!active) {
      active = true;
      failures = 0;
      clearTimeout(nextPoll);
      checkIdle();
      void run();
    }
  }

  function visibilityChanged() {
    if (target.hidden) {
      pause();
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
    pause();
    for (const event of events) {
      target.removeEventListener(event, interact, true);
    }
    target.removeEventListener('visibilitychange', visibilityChanged);
  };
}
