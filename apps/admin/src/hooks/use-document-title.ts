import { useEffect, useSyncExternalStore } from 'react';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

// The title a page has asked for in place of Admin's own, by the latest page to ask.
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
 * Shows `title` as the document's title while the calling page is mounted, in place of
 * Admin's own, which comes back once it unmounts or passes `undefined`.
 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title === undefined) {
      return;
    }
    const own = { title };
    setPageTitle(own);
    return () => {
      // Only its own: another page may have asked since.
      if (pageTitle === own) {
        setPageTitle(undefined);
      }
    };
  }, [title]);
}

/** Keeps the document's title: Admin's, with the site's, unless a page has given its own. */
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
