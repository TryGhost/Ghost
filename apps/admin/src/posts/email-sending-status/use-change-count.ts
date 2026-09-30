import { useState } from 'react';

/**
 * Counts changes to `value` after `ready`: 0 means don't animate, so first
 * renders stay still. Key the animated element with it so every change
 * replays the animation instead of only the first.
 */
export function useChangeCount(value: unknown, ready = true): number {
  const [settledValue, setSettledValue] = useState<{ value: unknown } | null>(null);
  const [changeCount, setChangeCount] = useState(0);

  // Set during render so the new state never paints without the animation.
  if (ready && (settledValue === null || settledValue.value !== value)) {
    if (settledValue !== null) {
      setChangeCount(changeCount + 1);
    }
    setSettledValue({ value });
  }

  return changeCount;
}
