import * as Sentry from '@sentry/react';
import { type ReactNode, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { reloadAdmin } from '@/auth/api';
import { reloadAfterChunkLoadError } from '@/chunk-load-recovery';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import ErrorBoundary from '@/settings/components/error-boundary';
import { OpenGlobalSearchContext } from './global-search-context';
import { isSearchShortcut } from './search-shortcut';

// the modal pulls in the search index and FlexSearch, so it loads once search is available
const loadGlobalSearchModal = () => import('./global-search-modal');
const GlobalSearchModal = lazy(loadGlobalSearchModal);

const OPEN_DIALOG = ':is([role="dialog"], [role="alertdialog"])[data-state="open"]';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Stands in for a search modal that failed, so the rest of the admin keeps working. */
function SearchError({ open, onOpenChange }: SearchModalProps) {
  const { pathname, search } = useLocation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search didn&apos;t load</DialogTitle>
          <DialogDescription>Reload Ghost Admin to try again.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => reloadAdmin(`${pathname}${search}`)}>Reload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Owns the Cmd-K search modal: its open state, the Cmd/Ctrl+K shortcut, and
 * the lazily loaded modal.
 */
export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const canSearch = useAdminSidebarVisibility();
  const location = useLocation();

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

    // A failure is left for opening search to surface.
    loadGlobalSearchModal().catch(() => undefined);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) {
        return;
      }
      // a result picked over another dialog (eg. an unsaved-changes prompt) would redirect it
      if (!modal.open && document.querySelector(OPEN_DIALOG)) {
        return;
      }
      event.preventDefault();
      openSearch();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [canSearch, modal.open, openSearch, setOpen]);

  return (
    <OpenGlobalSearchContext.Provider value={canSearch ? openSearch : null}>
      {children}
      {modal.count > 0 && (
        <ErrorBoundary
          key={modal.count}
          fallback={<SearchError open={modal.open} onOpenChange={setOpen} />}
          name="search"
          onError={(error, info) => {
            if (!reloadAfterChunkLoadError(error, location)) {
              Sentry.captureException(error, {
                contexts: { react: { componentStack: info.componentStack } },
              });
            }
          }}
        >
          <Suspense fallback={null}>
            <GlobalSearchModal open={modal.open} onOpenChange={setOpen} />
          </Suspense>
        </ErrorBoundary>
      )}
    </OpenGlobalSearchContext.Provider>
  );
}
