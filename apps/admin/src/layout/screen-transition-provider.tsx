import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import {
  matchRoutes,
  useLocation,
  useMatches,
  type AdminRouteHandle,
  type ViewTransitionController,
  ViewTransitionControllerProvider,
} from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { hasActiveUnsavedChangesGuard } from '@/hooks/active-unsaved-changes-guards';
import { routes, useEmberOwnedRouteMatcher } from '@/routes';
import { shouldRunScreenTransition } from './screen-transition';

// Matches the exit transitions in index.css
const EXIT_DURATION_MS = 200;
// Clears a held exit whose navigation never landed (e.g. a blocker held it)
const EXIT_SAFETY_MS = 1000;
// Outlasts the view transition's enter animations
const ENTER_DURATION_MS = 600;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function hidesSidebar(handle: unknown): boolean {
  return Boolean((handle as AdminRouteHandle | undefined)?.hideAdminSidebar);
}

function isScreenTransitionHandle(handle: unknown): boolean {
  return Boolean((handle as AdminRouteHandle | undefined)?.screenTransition);
}

/**
 * Runs router navigations across a full-screen surface's boundary as a view
 * transition. Entering a surface fades the current screen out on the live page
 * first, so the surface's render happens while nothing is visible instead of
 * freezing the old screen; the view transition then only fades it in. Leaving
 * one navigates at once with a short cross-fade.
 */
export function ScreenTransitionProvider({ children }: { children: ReactNode }) {
  const enabled = useFeatureFlag('admin7ScreenTransitions');
  const settingsSidebarEnabled = useFeatureFlag('admin7settings');
  const matches = useMatches();
  const isEmberOwned = useEmberOwnedRouteMatcher();
  const location = useLocation();

  // Updated during render so links rendered below already see the new matches.
  const latest = useRef({ enabled, settingsSidebarEnabled, matches, isEmberOwned });
  latest.current = { enabled, settingsSidebarEnabled, matches, isEmberOwned };
  const exitingRef = useRef(false);
  const timersRef = useRef<{ safety?: number; enter?: number }>({});

  const controller = useMemo<ViewTransitionController>(() => {
    const root = document.documentElement;

    const clearExit = () => {
      window.clearTimeout(timersRef.current.safety);
      delete root.dataset.screenExit;
    };

    return {
      shouldTransition(pathname) {
        const current = latest.current;
        if (!current.enabled) {
          return false;
        }
        const target = matchRoutes(routes, pathname) ?? [];
        return (
          shouldRunScreenTransition({
            from: current.matches.map((match) => match.handle),
            to: target.map((match): unknown => match.route.handle),
            enabled: current.enabled,
            settingsSidebarEnabled: current.settingsSidebarEnabled,
          }) && !current.isEmberOwned(pathname)
        );
      },
      beforeTransition(pathname) {
        if (exitingRef.current) {
          return Promise.resolve(false);
        }
        window.clearTimeout(timersRef.current.enter);
        delete root.dataset.screenTransition;
        if (prefersReducedMotion()) {
          return undefined;
        }

        // Leaving a surface goes straight back: the screen it returns to renders
        // its cheap first frame and fills in after the cross-fade.
        const target = matchRoutes(routes, pathname) ?? [];
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

        return new Promise((resolve) => {
          window.setTimeout(() => {
            exitingRef.current = false;
            root.dataset.screenTransition = 'after-exit';
            timersRef.current.safety = window.setTimeout(clearExit, EXIT_SAFETY_MS);
            resolve(true);
          }, EXIT_DURATION_MS);
        });
      },
    };
  }, []);

  // The new screen commits inside the view transition's DOM update, so it is
  // revealed before the browser snapshots it.
  useLayoutEffect(() => {
    const root = document.documentElement;
    window.clearTimeout(timersRef.current.safety);
    delete root.dataset.screenExit;
    if (root.dataset.screenTransition) {
      timersRef.current.enter = window.setTimeout(() => {
        delete root.dataset.screenTransition;
      }, ENTER_DURATION_MS);
    }
  }, [location.key]);

  return (
    <ViewTransitionControllerProvider value={controller}>
      {children}
    </ViewTransitionControllerProvider>
  );
}
