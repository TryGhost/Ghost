import React from 'react';

const Context = React.createContext({});

export const SharedOnChangeContext = ({onChange, children}) => {
    const onChangeContext = React.useMemo(
        () => ({onChange}),
        [onChange]
    );

    return <Context.Provider value={onChangeContext}>{children}</Context.Provider>;
};

export const useSharedOnChangeContext = () => React.useContext(Context);
