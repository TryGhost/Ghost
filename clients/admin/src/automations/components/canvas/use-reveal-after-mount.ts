import { useEffect, useState } from 'react';

export const ENTRANCE_EASE = 'ease-[cubic-bezier(0.22,0.61,0.36,1)]';

// False for the first frame when `active`, then true, so a CSS transition runs from the
// hidden state. Waits for `ready` (e.g. a measured length) before revealing.
export const useRevealAfterMount = (active: boolean, ready = true): boolean => {
  const [shown, setShown] = useState(!active);
  useEffect(() => {
    if (shown || !ready) {
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [shown, ready]);
  return shown;
};
