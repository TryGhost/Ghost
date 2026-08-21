import {createContext, useContext} from 'react';

type BuilderToolbarHost = {
    element: HTMLElement | null;
    isNarrow: boolean;
};

export const BuilderToolbarHostContext = createContext<BuilderToolbarHost>({
    element: null,
    isNarrow: false
});

export const useBuilderToolbarHost = () => useContext(BuilderToolbarHostContext);
