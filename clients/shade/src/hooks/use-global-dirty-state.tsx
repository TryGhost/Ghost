import React, { useCallback, useContext, useEffect, useId } from 'react';

interface GlobalDirtyState {
  isDirty: boolean;
  setGlobalDirtyState: (id: string, dirty: boolean) => void;
}

export const GlobalDirtyStateContext = React.createContext<GlobalDirtyState>({
  isDirty: false,
  setGlobalDirtyState: () => {},
});

const useGlobalDirtyState = () => {
  const id = useId();
  const { isDirty, setGlobalDirtyState } = useContext(GlobalDirtyStateContext);

  useEffect(() => {
    // Make sure the state is reset when the component unmounts
    return () => setGlobalDirtyState(id, false);
  }, [id, setGlobalDirtyState]);

  const setDirty = useCallback(
    (dirty: boolean) => setGlobalDirtyState(id, dirty),
    [id, setGlobalDirtyState],
  );

  return {
    isDirty,
    setGlobalDirtyState: setDirty,
  };
};

export default useGlobalDirtyState;
