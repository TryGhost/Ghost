import React from 'react';
import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';

interface SharedHistoryContextType {
    historyState: HistoryState;
}

const Context = React.createContext<SharedHistoryContextType>({
    historyState: createEmptyHistoryState()
});

export const SharedHistoryContext = ({children}: {children: React.ReactNode}) => {
    const historyContext = React.useMemo(
        () => ({historyState: createEmptyHistoryState()}),
        []
    );

    return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

export const useSharedHistoryContext = () => React.useContext(Context);
