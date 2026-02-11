import {createContext} from 'react';
import type SearchIndex from './SearchIndex';

export interface AppContextType {
    posts: unknown[];
    authors: unknown[];
    tags: unknown[];
    action: string;
    lastPage: string;
    page: string;
    pageData: Record<string, unknown>;
    dispatch: (action: string, data?: Record<string, unknown>) => void;
    searchIndex: SearchIndex | null;
    indexComplete: boolean;
    searchValue: string;
    inputRef: React.RefObject<HTMLInputElement> | null;
    showPopup: boolean;
    adminUrl: string;
    inlineStyles?: string;
    t: (key: string) => string;
    dir: 'ltr' | 'rtl';
}

const AppContext = createContext<AppContextType>({
    posts: [],
    authors: [],
    tags: [],
    action: '',
    lastPage: '',
    page: '',
    pageData: {},
    dispatch: () => {},
    searchIndex: null,
    indexComplete: false,
    searchValue: '',
    inputRef: null,
    showPopup: false,
    adminUrl: '',
    inlineStyles: undefined,
    t: (key: string) => key,
    dir: 'ltr'
});

export default AppContext;
