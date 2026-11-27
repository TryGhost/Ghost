import React, { useCallback, useState } from 'react';

import { GlobalDirtyStateContext } from '@/hooks/use-global-dirty-state';

export const GlobalDirtyStateProvider = ({ children }: { children: React.ReactNode }) => {
  // Allows each component to register itself as dirty with a unique ID, so when one is reset/saved the overall page dirty state persists
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);

  const setGlobalDirtyState = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (dirty && !current.includes(id)) {
        return [...current, id];
      }

      if (!dirty && current.includes(id)) {
        return current.filter((currentId) => currentId !== id);
      }

      return current;
    });
  }, []);

  return (
    <GlobalDirtyStateContext.Provider value={{ isDirty: dirtyIds.length > 0, setGlobalDirtyState }}>
      {children}
    </GlobalDirtyStateContext.Provider>
  );
};
