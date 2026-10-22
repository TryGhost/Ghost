import React from 'react';
import type {SerializedEditorState} from 'lexical';

interface SharedOnChangeContextType {
    onChange?: (serializedState: SerializedEditorState) => void;
}

const Context = React.createContext<SharedOnChangeContextType>({});

export const SharedOnChangeContext = ({onChange, children}: {onChange?: SharedOnChangeContextType['onChange']; children: React.ReactNode}) => {
    const onChangeContext = React.useMemo(
        () => ({onChange}),
        [onChange]
    );

    return <Context.Provider value={onChangeContext}>{children}</Context.Provider>;
};

export const useSharedOnChangeContext = () => React.useContext(Context);
