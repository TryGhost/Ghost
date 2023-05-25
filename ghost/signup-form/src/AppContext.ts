// Ref: https://reactjs.org/docs/context.html
import React, {ComponentProps, useContext} from 'react';
import pages, {Page, PageName} from './pages';
import {GhostApi} from './utils/api';

export type ColorScheme = 'light' | 'dark' | 'auto'

export type SignupFormOptions = {
    title?: string,
    description?: string,
    logo?: string,
    color?: string,
    site: string,
    labels: string[],
    colorScheme: ColorScheme
};

export type AppContextType = {
    page: Page,
    setPage: <T extends PageName>(name: T, data: ComponentProps<typeof pages[T]>) => void,
    options: SignupFormOptions,
    api: GhostApi,
}

const AppContext = React.createContext<AppContextType>({} as any);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);
