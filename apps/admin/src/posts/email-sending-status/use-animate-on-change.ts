import { useState } from 'react';

/** True once `value` has changed after `ready`, so first renders don't animate. */
export function useAnimateOnChange(value: unknown, ready = true): boolean {
  const [settledValue, setSettledValue] = useState<{ value: unknown } | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  // Set during render so the new state never paints without the animation.
  if (ready && (settledValue === null || settledValue.value !== value)) {
    if (settledValue !== null) {
      setHasChanged(true);
    }
    setSettledValue({ value });
  }

  return hasChanged;
}
