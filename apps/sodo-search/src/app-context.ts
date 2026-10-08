import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type SearchIndex from './search-index';
import type { RefObject } from 'preact';

type TranslationFunction = (key: string) => string;

export type AppContextType = {
  searchIndex: SearchIndex;
  indexComplete: boolean;
  searchValue: string;
  setSearchValue: (searchValue: string) => void;
  closePopup: () => void;
  inputRef: RefObject<HTMLInputElement>;
  stylesUrl?: string;
  t: TranslationFunction;
  dir: 'ltr' | 'rtl';
};

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppContext.Provider');
  }
  return context;
}

export default AppContext;
