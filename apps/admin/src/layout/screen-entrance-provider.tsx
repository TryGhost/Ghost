import { type ReactNode, useState } from 'react';
import { isEnteringScreen, ScreenEntranceContext } from './screen-transition';

/** Latches, as it mounts, whether its screen opened through a screen transition. */
export function ScreenEntranceProvider({ children }: { children: ReactNode }) {
  const [entering] = useState(isEnteringScreen);
  return (
    <ScreenEntranceContext.Provider value={entering}>{children}</ScreenEntranceContext.Provider>
  );
}
