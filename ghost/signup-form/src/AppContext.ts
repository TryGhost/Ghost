// Ref: https://reactjs.org/docs/context.html
import React from 'react';
import {DispatchActionMethod} from './actions';
import {GhostApi} from './utils/api';
import {Page} from './pages';

export type AppContextType = {
    page: Page,
    api: GhostApi,
    dispatchAction: DispatchActionMethod
}

export type EditableAppContextType = Omit<AppContextType, 'dispatchAction' | 'api'>;
export const AppContext = React.createContext<AppContextType>({
    page: {
        name: 'form',
        data: {}
    },
    dispatchAction: () => {},
    api: {} as any
});
