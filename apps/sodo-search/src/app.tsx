import AppContext from './app-context';
import PopupModal from './components/popup-modal';
import SearchIndex from './search-index';
import i18nLib from '@tryghost/i18n/registry/search';
import { useEffect, useRef, useState } from 'preact/hooks';

type AppProps = {
  adminUrl: string;
  apiKey?: string;
  stylesUrl?: string;
  locale?: string;
};

// Used for adding trailing margin to prevent layout shift when popup appears
function getScrollbarWidth() {
  const div = document.createElement('div');
  div.style.visibility = 'hidden';
  div.style.overflow = 'scroll';
  document.body.appendChild(div);

  const scrollbarWidth = div.offsetWidth - div.clientWidth;

  document.body.removeChild(div);

  return scrollbarWidth;
}

function getCustomTriggerButtons() {
  return document.querySelectorAll('[data-ghost-search]');
}

function isSearchUrl() {
  const [path] = window.location.hash.slice(1).split('?');
  return path === '/search' || path === '/search/';
}

export default function App({ adminUrl, apiKey, stylesUrl, locale }: AppProps) {
  const [{ t, dir, searchIndex }] = useState(() => {
    const i18n = i18nLib(locale || 'en', 'search');
    const i18nDir = i18n.dir() || 'ltr';
    return {
      t: i18n.t,
      dir: i18nDir,
      searchIndex: new SearchIndex({ adminUrl, apiKey, dir: i18nDir }),
    };
  });
  const [showPopup, setShowPopup] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [indexComplete, setIndexComplete] = useState(false);
  const indexStarted = useRef(false);
  const scrollbarWidth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollbarWidth.current = getScrollbarWidth();

    const handleSearchUrl = () => {
      if (isSearchUrl()) {
        setShowPopup(true);
        window.history.replaceState('', document.title, window.location.pathname);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && e.metaKey) {
        setShowPopup(true);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTriggerClick = (e: Event) => {
      e.preventDefault();
      setShowPopup(true);

      // Focusing a temporary input inside the click handler keeps the
      // on-screen keyboard open on iOS until the real input mounts
      const tmpElement = document.createElement('input');
      tmpElement.style.opacity = '0';
      tmpElement.style.position = 'fixed';
      tmpElement.style.top = '0';
      document.body.appendChild(tmpElement);
      tmpElement.focus();

      setTimeout(() => {
        inputRef.current?.focus();
        document.body.removeChild(tmpElement);
      }, 150);
    };

    handleSearchUrl();

    const customTriggerButtons = getCustomTriggerButtons();
    if (customTriggerButtons.length) {
      document.addEventListener('keydown', handleKeyDown);
    }
    customTriggerButtons.forEach((button) => {
      button.addEventListener('click', handleTriggerClick);
    });
    window.addEventListener('hashchange', handleSearchUrl, false);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      customTriggerButtons.forEach((button) => {
        button.removeEventListener('click', handleTriggerClick);
      });
      window.removeEventListener('hashchange', handleSearchUrl, false);
    };
  }, []);

  useEffect(() => {
    if (!showPopup) {
      return;
    }

    if (!indexStarted.current) {
      indexStarted.current = true;
      searchIndex.init().then(() => {
        setIndexComplete(true);
      });
    }

    // Remove background scroll while the popup is open
    const body = document.body;
    let bodyScroll = '';
    let bodyMargin = '';
    try {
      bodyScroll = body.style.overflow;
      bodyMargin = window.getComputedStyle(body).getPropertyValue('margin-right');
      body.style.overflow = 'hidden';
      if (scrollbarWidth.current && body.scrollHeight > window.innerHeight) {
        body.style.marginRight = `calc(${bodyMargin} + ${scrollbarWidth.current}px)`;
      }
    } catch {
      // Ignore any errors for scroll handling
    }

    return () => {
      try {
        body.style.overflow = bodyScroll || '';
        if (!bodyMargin || bodyMargin === '0px') {
          body.style.marginRight = '';
        } else {
          body.style.marginRight = bodyMargin;
        }
      } catch {
        // Ignore any errors for scroll handling
      }
    };
  }, [showPopup, searchIndex]);

  if (!showPopup) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        searchIndex,
        indexComplete,
        searchValue,
        setSearchValue,
        closePopup: () => {
          setShowPopup(false);
          setSearchValue('');
        },
        inputRef,
        stylesUrl,
        t,
        dir,
      }}
    >
      <PopupModal />
    </AppContext.Provider>
  );
}
