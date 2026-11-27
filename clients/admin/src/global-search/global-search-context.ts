import { createContext, useContext } from 'react';

export const OpenGlobalSearchContext = createContext<(() => void) | null>(null);

/** Opens the Cmd-K search, or null while the sidebar is hidden. */
export function useOpenGlobalSearch() {
  return useContext(OpenGlobalSearchContext);
}
