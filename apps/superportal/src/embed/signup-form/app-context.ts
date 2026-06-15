import {ComponentProps, createContext, useContext} from 'react';
import {GhostApi} from './utils/api';
import {SignupFormOptions} from './utils/helpers';
import {Translator} from './utils/i18n';
import pages, {Page, PageName} from './pages';

export type SetPage = <T extends PageName>(name: T, data: ComponentProps<(typeof pages)[T]>) => void;

export interface AppContextType {
    page: Page;
    setPage: SetPage;
    options: SignupFormOptions;
    api: GhostApi;
    t: Translator;
    scriptTag: HTMLElement;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = (): AppContextType => useContext(AppContext);
