import { useEffect, useSyncExternalStore } from 'react';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

// The title the most recent page asked to show instead of Admin's own.
let pageTitle: { title: string } | undefined;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setPageTitle = (next: { title: string } | undefined) => {
  pageTitle = next;
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Shows `title` as the document's title, instead of Admin's own, while the calling page is mounted.
 * Admin's title comes back once the page unmounts or passes `undefined`.
 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title === undefined) {
      return;
    }
    const own = { title };
    setPageTitle(own);
    return () => {
      // Only clear this page's title: another page may have set one since.
      if (pageTitle === own) {
        setPageTitle(undefined);
      }
    };
  }, [title]);
}

/** Sets the document's title to Admin's title with the site's, unless a page has set its own. */
export function useDocumentTitle() {
  const { data } = useBrowseSite({ defaultErrorHandler: false });
  const siteTitle = data?.site.title;
  const page = useSyncExternalStore(subscribe, () => pageTitle?.title);

  useEffect(() => {
    if (page !== undefined) {
      document.title = page;
    } else if (siteTitle !== undefined) {
      document.title = `Ghost Admin - ${siteTitle}`;
    }
  }, [page, siteTitle]);
}
