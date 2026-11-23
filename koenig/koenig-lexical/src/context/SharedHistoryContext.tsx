import React from 'react';
import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';

export interface SharedHistoryContextValue {
    historyState?: HistoryState;
}

// No default history state: editors rendered without a provider must each keep
// their own undo stack, which HistoryPlugin creates when it gets `undefined`
const Context = React.createContext<SharedHistoryContextValue>({});

export const SharedHistoryContext = ({children}: {children: React.ReactNode}) => {
    const historyContext = React.useMemo(
        () => ({historyState: createEmptyHistoryState()}),
        []
    );

    return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

export const useSharedHistoryContext = () => React.useContext(Context);
