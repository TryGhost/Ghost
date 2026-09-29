import { createContext, useContext } from 'react';

export const OpenGlobalSearchContext = createContext<(() => void) | null>(null);

/** Opens the React Cmd-K search, or null while Ember still owns search. */
export function useOpenGlobalSearch() {
  return useContext(OpenGlobalSearchContext);
}
