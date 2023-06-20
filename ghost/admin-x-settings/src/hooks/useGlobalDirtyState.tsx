import React, {useCallback, useContext, useEffect, useId, useState} from 'react';

interface GlobalDirtyState {
    setGlobalDirtyState: (reason: string, dirty: boolean) => void;
}

const GlobalDirtyStateContext = React.createContext<GlobalDirtyState>({setGlobalDirtyState: () => {}});

export const GlobalDirtyStateProvider = ({setDirty, children}: {setDirty?: (dirty: boolean) => void; children: React.ReactNode}) => {
    // Allows each component to register itself as dirty, so when one is reset/saved the overall page dirty state persists
    const [dirtyReasons, setDirtyReasons] = useState<string[]>([]);

    const setGlobalDirtyState = useCallback((reason: string, dirty: boolean) => {
        setDirtyReasons((current) => {
            if (dirty && !current.includes(reason)) {
                return [...current, reason];
            }

            if (!dirty && current.includes(reason)) {
                return current.filter(currentReason => currentReason !== reason);
            }

            return current;
        });
    }, []);

    useEffect(() => {
        setDirty?.(dirtyReasons.length > 0);
    }, [dirtyReasons, setDirty]);

    return (
        <GlobalDirtyStateContext.Provider value={{setGlobalDirtyState}}>
            {children}
        </GlobalDirtyStateContext.Provider>
    );
};

const useGlobalDirtyState = () => {
    const id = useId();
    const {setGlobalDirtyState} = useContext(GlobalDirtyStateContext);

    useEffect(() => {
        // Make sure the state is reset when the component unmounts
        return () => setGlobalDirtyState(id, false);
    }, [id, setGlobalDirtyState]);

    const setDirty = useCallback(
        (dirty: boolean) => setGlobalDirtyState(id, dirty),
        [id, setGlobalDirtyState]
    );

    return {
        setGlobalDirtyState: setDirty
    };
};

export default useGlobalDirtyState;
