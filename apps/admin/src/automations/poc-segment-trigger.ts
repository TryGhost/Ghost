import { useCallback, useSyncExternalStore } from 'react';

/**
 * POC (poc/segments-ui) only: the mock "Member entered segment" trigger.
 *
 * The server has no such trigger, so an automation made with it is saved as a "Free member
 * signed up" automation, and this remembers, in the browser's local storage, that it stands for
 * a segment trigger and which segment was chosen. The trigger chooser and the trigger card then
 * show it as a segment trigger. Nothing starts when a member enters the segment, and publishing
 * the automation would run it for free signups.
 */

const KEY = 'ghost-poc:segment-triggers';

/** The id a new automation has in its URL until it is first saved. */
export const NEW_AUTOMATION = 'new';

// Automation id to the segment chosen for it, or '' when none is chosen yet.
type SegmentTriggers = Readonly<Record<string, string>>;

const listeners = new Set<() => void>();
let cached: SegmentTriggers | null = null;

function read(): SegmentTriggers {
  if (cached) {
    return cached;
  }
  let stored: SegmentTriggers = {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      stored = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    }
  } catch {
    // Storage that can't be read holds nothing.
  }
  cached = stored;
  return stored;
}

function write(next: SegmentTriggers) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this page load only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks the automation being made as one with the segment trigger, or clears the mark. */
export function markNewAutomationSegmentTrigger(on: boolean) {
  const others = Object.fromEntries(
    Object.entries(read()).filter(([automationId]) => automationId !== NEW_AUTOMATION),
  );
  write(on ? { ...others, [NEW_AUTOMATION]: '' } : others);
}

/**
 * The mock segment trigger of the automation with `automationId`: whether it has one, the
 * segment chosen, and a way to choose one. A new automation keeps the mark under its temporary
 * id, and `adopt` hands it to the id the automation is saved under.
 */
export function useSegmentTrigger(automationId: string) {
  const triggers = useSyncExternalStore(subscribe, read);
  const segmentId = triggers[automationId];

  const setSegmentId = useCallback(
    (next: string) => write({ ...read(), [automationId]: next }),
    [automationId],
  );
  const adopt = useCallback(() => {
    const { [NEW_AUTOMATION]: pending, ...others } = read();
    if (pending !== undefined && automationId !== NEW_AUTOMATION) {
      write({ ...others, [automationId]: pending });
    }
  }, [automationId]);

  return {
    isSegmentTrigger: segmentId !== undefined,
    segmentId: segmentId || undefined,
    setSegmentId,
    adopt,
  };
}
