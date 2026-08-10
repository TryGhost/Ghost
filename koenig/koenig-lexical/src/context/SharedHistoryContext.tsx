import React from 'react';
import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';

const Context = React.createContext({});

export const SharedHistoryContext = ({children}) => {
    const historyContext = React.useMemo(
        () => ({historyState: createEmptyHistoryState()}),
        []
    );

    return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

export const useSharedHistoryContext = () => React.useContext(Context);
