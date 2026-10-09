import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  useLocation,
  useMatches,
  useViewTransitionState,
  type AdminRouteHandle,
  type ViewTransitionController,
  ViewTransitionControllerProvider,
} from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { hasActiveUnsavedChangesGuard } from '@/hooks/active-unsaved-changes-guards';
import { matchAdminRoutes, useEmberOwnedRouteMatcher } from '@/routes';
import { shouldRunScreenTransition } from './screen-transition';

// The parts of the page that fade out before entering a surface (index.css)
const EXIT_TARGETS = '.screen-exit-content, .screen-exit-sidebar, .screen-exit-mobile-nav';

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function hidesSidebar(handle: unknown): boolean {
  return Boolean((handle as AdminRouteHandle | undefined)?.hideAdminSidebar);
}

function isScreenTransitionHandle(handle: unknown): boolean {
  return Boolean((handle as AdminRouteHandle | undefined)?.screenTransition);
}

/** Resolves once the exit styles' transitions have run, however long index.css makes them. */
function exitTransitionsFinished(): Promise<void> {
  // Reading animations flushes styles, so the transitions the exit styles start are listed
  const animations = Array.from(document.querySelectorAll(EXIT_TARGETS)).flatMap((element) =>
    element.getAnimations(),
  );
  return Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
    () => undefined,
  );
}

/**
 * Runs router navigations across a full-screen surface's boundary as a view
 * transition. Entering a surface fades the current screen out on the live page
 * first, so the surface's render happens while nothing is visible instead of
 * freezing the old screen; the view transition then only fades it in. Leaving
 * one navigates at once with a short cross-fade.
 *
 * Nothing here waits on a fixed duration: the exit waits on its own
 * transitions, and the markers on <html> last until the view transition
 * finishes, or the navigation settles without landing.
 */
export function ScreenTransitionProvider({ children }: { children: ReactNode }) {
  const settingsSidebarEnabled = useFeatureFlag('admin7settings');
  const matches = useMatches();
  const isEmberOwned = useEmberOwnedRouteMatcher();
  const location = useLocation();
  // True from the router starting a view transition to or from this screen until it finishes
  const viewTransitionRunning = useViewTransitionState(location.pathname);
  const viewTransitionRunningRef = useRef(viewTransitionRunning);
  viewTransitionRunningRef.current = viewTransitionRunning;

  // Updated during render so links rendered below already see the new matches.
  const latest = useRef({ settingsSidebarEnabled, matches, isEmberOwned });
  latest.current = { settingsSidebarEnabled, matches, isEmberOwned };
  const exitingRef = useRef(false);
  // Where the current transition's navigation started, to tell one a blocker held from one that landed
  const fromHashRef = useRef<string | null>(null);

  const controller = useMemo<ViewTransitionController>(() => {
    const root = document.documentElement;

    const clearMarkers = () => {
      delete root.dataset.screenExit;
      delete root.dataset.screenTransition;
      fromHashRef.current = null;
    };

    return {
      shouldTransition(pathname) {
        const current = latest.current;
        const target = matchAdminRoutes(pathname) ?? [];
        return (
          shouldRunScreenTransition({
            from: current.matches.map((match) => match.handle),
            to: target.map((match): unknown => match.route.handle),
            settingsSidebarEnabled: current.settingsSidebarEnabled,
          }) && !current.isEmberOwned(pathname)
        );
      },
      beforeTransition(pathname) {
        if (exitingRef.current) {
          return Promise.resolve(false);
        }
        clearMarkers();
        fromHashRef.current = window.location.hash;
        if (prefersReducedMotion()) {
          return undefined;
        }

        // Leaving a surface goes straight back: the screen it returns to renders
        // its cheap first frame and fills in after the cross-fade.
        const target = matchAdminRoutes(pathname) ?? [];
        if (!target.some((match) => isScreenTransitionHandle(match.route.handle))) {
          root.dataset.screenTransition = 'return';
          return undefined;
        }
        // A guard may hold the exit for a save or a confirm dialog
        if (hasActiveUnsavedChangesGuard()) {
          return undefined;
        }

        root.dataset.screenExit = target.some((match) => hidesSidebar(match.route.handle))
          ? 'hide-sidebar'
          : 'content';
        exitingRef.current = true;
        return exitTransitionsFinished().then(() => {
          exitingRef.current = false;
          root.dataset.screenTransition = 'after-exit';
          return true;
        });
      },
      // The next screen may take a while to load, so a faded-out screen only
      // comes back, and the markers only go, once its navigation has settled
      // without landing (a blocker held it). One that lands is handled as it
      // commits and as its view transition finishes.
      afterTransition() {
        if (window.location.hash === fromHashRef.current) {
          clearMarkers();
        }
      },
    };
  }, []);

  // The new screen commits inside the view transition's DOM update, so it is
  // revealed before the browser snapshots it. The transition marker styles the
  // view transition's animations, so it stays until that finishes; without a
  // view transition (no browser support, a hidden tab) it goes with the commit.
  useLayoutEffect(() => {
    const root = document.documentElement;
    delete root.dataset.screenExit;
    if (!viewTransitionRunningRef.current) {
      delete root.dataset.screenTransition;
      fromHashRef.current = null;
    }
  }, [location.key]);

  useEffect(() => {
    if (!viewTransitionRunning) {
      delete document.documentElement.dataset.screenTransition;
      fromHashRef.current = null;
    }
  }, [viewTransitionRunning]);

  return (
    <ViewTransitionControllerProvider value={controller}>
      {children}
    </ViewTransitionControllerProvider>
  );
}
