import { createContext } from 'preact';
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

const AppContext = createContext<AppContextType>({} as AppContextType);

export default AppContext;
