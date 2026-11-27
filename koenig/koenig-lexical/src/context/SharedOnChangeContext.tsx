import React from 'react';
import type {SerializedEditorState} from 'lexical';

export type SerializedEditorStateChangeHandler = (serializedState: SerializedEditorState) => void;

export interface SharedOnChangeContextValue {
    onChange?: SerializedEditorStateChangeHandler;
}

const Context = React.createContext<SharedOnChangeContextValue>({});

interface SharedOnChangeContextProps extends SharedOnChangeContextValue {
    children: React.ReactNode;
}

export const SharedOnChangeContext = ({onChange, children}: SharedOnChangeContextProps) => {
    const onChangeContext = React.useMemo(
        () => ({onChange}),
        [onChange]
    );

    return <Context.Provider value={onChangeContext}>{children}</Context.Provider>;
};

export const useSharedOnChangeContext = () => React.useContext(Context);
