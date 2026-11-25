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

// v2: the first version handed the mark to whichever automation was opened next, so it marked
// automations that were never made with the segment trigger. A new key leaves those behind.
const KEY = 'ghost-poc:segment-triggers:v2';

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
 * Gives the new automation's mark to the id it has just been saved under. Called by the editor
 * at the moment a new automation is first saved, and nowhere else: only an automation made with
 * the segment trigger may take the mark.
 *
 * The mark stays under the temporary id too, so the card keeps showing the segment trigger
 * until the URL has moved to the new id. Starting another new automation clears it.
 */
export function adoptNewAutomationSegmentTrigger(createdId: string) {
  const triggers = read();
  const pending = triggers[NEW_AUTOMATION];
  if (pending !== undefined) {
    write({ ...triggers, [createdId]: pending });
  }
}

/**
 * The mock segment trigger of the automation with `automationId`: whether it has one, the
 * segment chosen, and a way to choose one. A new automation keeps the mark under its temporary
 * id until it is first saved.
 */
export function useSegmentTrigger(automationId: string) {
  const triggers = useSyncExternalStore(subscribe, read);
  const segmentId = triggers[automationId];

  const setSegmentId = useCallback(
    (next: string) => write({ ...read(), [automationId]: next }),
    [automationId],
  );

  return {
    isSegmentTrigger: segmentId !== undefined,
    segmentId: segmentId || undefined,
    setSegmentId,
  };
}
