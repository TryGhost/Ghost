import { type ReactNode, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';
import { OpenGlobalSearchContext } from './global-search-context';
import { isSearchShortcut } from './search-shortcut';

// the modal pulls in the search index and FlexSearch, so it loads once search is available
const loadGlobalSearchModal = () => import('./global-search-modal');
const GlobalSearchModal = lazy(loadGlobalSearchModal);

/**
 * Owns the Cmd-K search modal behind the `globalSearchReact` flag: its open
 * state, the Cmd/Ctrl+K shortcut, and the lazily loaded modal.
 */
export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  // Ember's Labs state decides while Ember is present, so both sides agree on who owns search
  const enabled = useFlagGatedRouteOwner('globalSearchReact') === 'react';
  const sidebarVisible = useAdminSidebarVisibility();
  const canSearch = enabled && sidebarVisible;

  // `count` remounts the modal on each open so it starts with an empty term
  const [modal, setModal] = useState({ open: false, count: 0 });

  const openSearch = useCallback(() => {
    setModal((current) => (current.open ? current : { open: true, count: current.count + 1 }));
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setModal((current) => ({ ...current, open }));
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setOpen(false);
      return;
    }

    void loadGlobalSearchModal();

    // not skipped when already handled: Ember's own shortcut prevents the default first
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) {
        return;
      }
      event.preventDefault();
      openSearch();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [canSearch, openSearch, setOpen]);

  return (
    <OpenGlobalSearchContext.Provider value={canSearch ? openSearch : null}>
      {children}
      {modal.count > 0 && (
        <Suspense fallback={null}>
          <GlobalSearchModal key={modal.count} open={modal.open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </OpenGlobalSearchContext.Provider>
  );
}
